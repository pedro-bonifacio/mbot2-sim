import { robotAPI } from '../sim/robotAPI.js';
import { appendConsoleMessage } from '../ui/console.js';

// Called once per run as the JS-Interpreter initFunc.
// Injects robotAPI and console shims into the interpreter's global scope.
export function initInterpreter(interpreter, globalObject) {
  _injectRobotAPI(interpreter, globalObject);
  _injectConsole(interpreter, globalObject);
}

// js-interpreter reads asyncFunc.length to compute argLength = asyncFunc.length - 1.
// If the wrapper uses rest-params (...args), .length === 0, so argLength === -1 and
// new Array(-1) throws RangeError.  We must hand js-interpreter a function whose
// .length equals (number of user-facing args + 1 for the callback).
//
// makeAsyncWrapper returns a named-param function with the right .length, covering
// the arities we need (0-5 user args).
function makeAsyncWrapper(fn, userArgCount) {
  switch (userArgCount) {
    case 0: return function(cb)                       { fn(cb); };
    case 1: return function(a0, cb)                   { fn(a0, cb); };
    case 2: return function(a0, a1, cb)               { fn(a0, a1, cb); };
    case 3: return function(a0, a1, a2, cb)           { fn(a0, a1, a2, cb); };
    case 4: return function(a0, a1, a2, a3, cb)       { fn(a0, a1, a2, a3, cb); };
    case 5: return function(a0, a1, a2, a3, a4, cb)   { fn(a0, a1, a2, a3, a4, cb); };
    default: throw new Error(`makeAsyncWrapper: unsupported arity ${userArgCount}`);
  }
}

function _injectRobotAPI(interpreter, globalObject) {
  const apiObj = interpreter.nativeToPseudo({});
  interpreter.setProperty(globalObject, 'robotAPI', apiObj);

  for (const name of Object.keys(robotAPI)) {
    const method = robotAPI[name];
    if (typeof method !== 'function') continue;

    if (method._async) {
      // method.length includes the trailing `callback` param in the definition.
      // userArgCount = method.length - 1 is what codegen passes.
      const userArgCount = method.length - 1;
      const wrapper = makeAsyncWrapper(
        (...args) => method.apply(robotAPI, args),
        userArgCount,
      );
      interpreter.setProperty(
        apiObj,
        name,
        interpreter.createAsyncFunction(wrapper),
      );
    } else {
      interpreter.setProperty(
        apiObj,
        name,
        interpreter.createNativeFunction((...args) => {
          const result = method.apply(robotAPI, args);
          if (result === undefined || result === null) return result;
          if (typeof result !== 'object') return result;
          return interpreter.nativeToPseudo(result);
        }),
      );
    }
  }
}

function _injectConsole(interpreter, globalObject) {
  const consoleObj = interpreter.nativeToPseudo({});
  interpreter.setProperty(globalObject, 'console', consoleObj);

  const makeConsoleFn = (level) =>
    interpreter.createNativeFunction((text) => {
      const s = String(text ?? '');
      if (level === 'warn')       { console.warn(s);  appendConsoleMessage(s, 'warn');  }
      else if (level === 'error') { console.error(s); appendConsoleMessage(s, 'error'); }
      else                        { console.log(s);   appendConsoleMessage(s, 'info');  }
    });

  interpreter.setProperty(consoleObj, 'log',   makeConsoleFn('log'));
  interpreter.setProperty(consoleObj, 'warn',  makeConsoleFn('warn'));
  interpreter.setProperty(consoleObj, 'error', makeConsoleFn('error'));
}
