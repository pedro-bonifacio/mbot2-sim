# Generates the Open Roberta-format browser test programs (scripts/fixtures/teste-*.xml).
# Usage: python3 scripts/fixtures/make-test-programs.py scripts/fixtures
import sys, os
out = sys.argv[1]

def num(n): return f'<block type="math_number" intask="true"><field name="NUM">{n}</field></block>'
def txt(t): return f'<block type="text" intask="true"><field name="TEXT">{t}</field></block>'
def boolean(v): return f'<block type="logic_boolean" intask="true"><field name="BOOL">{v}</field></block>'
def get(name, t): return f'<block type="variables_get" intask="true"><mutation datatype="{t}"></mutation><field name="VAR">{name}</field></block>'
def setv(name, t, val): return f'<block type="variables_set" intask="true"><mutation datatype="{t}"></mutation><field name="VAR">{name}</field><value name="VALUE">{val}</value></block>'
def gdecl(name, t, val, nxt):
    return (f'<block type="robGlobalVariables_declare" intask="true" deletable="false" movable="false">'
            f'<mutation next="{str(nxt).lower()}" declaration_type="{t}"></mutation><field name="VAR">{name}</field>'
            f'<field name="TYPE">{t}</field><value name="VALUE">{val}</value></block>')
def ldecl(name, t, nxt=False):
    return (f'<block type="robLocalVariables_declare" intask="true" deletable="false" movable="false">'
            f'<mutation next="{str(nxt).lower()}" declaration_type="{t}"></mutation><field name="VAR">{name}</field>'
            f'<field name="TYPE">{t}</field></block>')
def start(decls=None):
    if not decls:
        return '<block type="robControls_start" intask="true" deletable="false"><mutation declare="false"></mutation><field name="DEBUG">TRUE</field></block>'
    body = ''.join(gdecl(n, t, v, i < len(decls) - 1) for i, (n, t, v) in enumerate(decls))
    return ('<block type="robControls_start" intask="true" deletable="false"><mutation declare="true"></mutation>'
            f'<field name="DEBUG">TRUE</field><statement name="ST">{body}</statement></block>')
def numlist(items):
    vals = ''.join(f'<value name="ADD{i}">{num(v)}</value>' for i, v in enumerate(items))
    return f'<block type="robLists_create_with" intask="true"><mutation items="{len(items)}" list_type="Number"></mutation><field name="LIST_TYPE">Number</field>{vals}</block>'
def drive(power, dist):
    return (f'<block type="robActions_motorDiff_on_for" intask="true"><field name="DIRECTION">FOREWARD</field><field name="ACTORPORT">_D</field>'
            f'<hide name="ACTORPORT" value="_D"></hide><value name="POWER">{power}</value><value name="DISTANCE">{dist}</value></block>')
def drive_on(power):
    return (f'<block type="robActions_motorDiff_on" intask="true"><field name="DIRECTION">FOREWARD</field><field name="ACTORPORT">_D</field>'
            f'<hide name="ACTORPORT" value="_D"></hide><value name="POWER">{power}</value></block>')
def turn(power, deg):
    return (f'<block type="robActions_motorDiff_turn_for" intask="true"><field name="DIRECTION">RIGHT</field><field name="ACTORPORT">_D</field>'
            f'<hide name="ACTORPORT" value="_D"></hide><value name="POWER">{power}</value><value name="DEGREE">{deg}</value></block>')
def stop(): return '<block type="robActions_motorDiff_stop" intask="true"><field name="ACTORPORT">_D</field><hide name="ACTORPORT" value="_D"></hide></block>'
def display(val, row=0):
    return (f'<block type="robActions_display_text" intask="true"><field name="ACTORPORT">_LCD</field><hide name="ACTORPORT" value="_LCD"></hide>'
            f'<value name="OUT">{val}</value><value name="COL">{num(0)}</value><value name="ROW">{num(row)}</value></block>')
def wait(ms): return f'<block type="robControls_wait_time" intask="true"><value name="WAIT">{num(ms)}</value></block>'
def join(*parts):
    vals = ''.join(f'<value name="ADD{i}">{p}</value>' for i, p in enumerate(parts))
    return f'<block type="robText_join" intask="true"><mutation items="{len(parts)}"></mutation>{vals}</block>'
def change(name, delta): return f'<block type="robMath_change" intask="true"><value name="VAR">{get(name, "Number")}</value><value name="DELTA">{num(delta)}</value></block>'
def repeat(times, body): return f'<block type="controls_repeat_ext" intask="true"><value name="TIMES">{times}</value><statement name="DO">{body}</statement></block>'
def foreach(var, lst, body):
    return (f'<block type="robControls_forEach" intask="true"><mutation list_type="Number"></mutation><field name="TYPE">Number</field>'
            f'<field name="VAR">{var}</field><value name="LIST">{lst}</value><statement name="DO">{body}</statement></block>')
def count(var, a, b, body):
    return (f'<block type="robControls_for" intask="true"><field name="VAR">{var}</field><value name="FROM">{num(a)}</value>'
            f'<value name="TO">{num(b)}</value><value name="BY">{num(1)}</value><statement name="DO">{body}</statement></block>')
def forever(body): return f'<block type="robControls_loopForever" intask="true"><statement name="DO">{body}</statement></block>'
def if_else(cond, then, other):
    return (f'<block type="robControls_ifElse" intask="true"><mutation else="1"></mutation><repetitions>'
            f'<value name="IF0">{cond}</value><statement name="DO0">{then}</statement><statement name="ELSE">{other}</statement></repetitions></block>')
def compare(op, a, b): return f'<block type="logic_compare" intask="true"><field name="OP">{op}</field><value name="A">{a}</value><value name="B">{b}</value></block>'
def ultrasonic():
    return ('<block type="robSensors_ultrasonic_getSample" intask="true"><mutation mode="DISTANCE"></mutation>'
            '<field name="MODE">DISTANCE</field><field name="SENSORPORT">U</field><field name="SLOT"></field></block>')
def arith(op, a, b): return f'<block type="math_arithmetic" intask="true"><field name="OP">{op}</field><value name="A">{a}</value><value name="B">{b}</value></block>'
def defnoreturn(name, params, body):
    st = ''.join(ldecl(n, t, i < len(params) - 1) for i, (n, t) in enumerate(params))
    decl = 'true' if params else 'false'
    return (f'<block type="robProcedures_defnoreturn" intask="true"><mutation declare="{decl}"></mutation><field name="NAME">{name}</field>'
            + (f'<statement name="ST">{st}</statement>' if params else '') + f'<statement name="STACK">{body}</statement></block>')
def defreturn(name, params, rtype, body, ret):
    st = ''.join(ldecl(n, t, i < len(params) - 1) for i, (n, t) in enumerate(params))
    return (f'<block type="robProcedures_defreturn" intask="true"><mutation declare="true" return_type="{rtype}"></mutation>'
            f'<field name="NAME">{name}</field><field name="TYPE">{rtype}</field><repetitions><statement name="ST">{st}</statement>'
            f'<statement name="STACK">{body}</statement><value name="RETURN">{ret}</value></repetitions></block>')
def call(name, args):
    a = ''.join(f'<arg name="{n}" type="{t}"></arg>' for n, t, _ in args)
    v = ''.join(f'<value name="ARG{i}">{val}</value>' for i, (_, _, val) in enumerate(args))
    return f'<block type="robProcedures_callnoreturn" intask="true"><mutation name="{name}">{a}</mutation>{v}</block>'
def callr(name, rtype, args):
    a = ''.join(f'<arg name="{n}" type="{t}"></arg>' for n, t, _ in args)
    v = ''.join(f'<value name="ARG{i}">{val}</value>' for i, (_, _, val) in enumerate(args))
    return f'<block type="robProcedures_callreturn" intask="true"><mutation name="{name}" output_type="{rtype}">{a}</mutation>{v}</block>'
def ifreturn(cond, val, rtype):
    return (f'<block type="robProcedures_ifreturn" intask="true"><mutation value="1" return_type="{rtype}"></mutation>'
            f'<value name="CONDITION">{cond}</value><value name="VALUE">{val}</value></block>')

def program(comment, *instances):
    body = ''.join(f'<instance x="{x}" y="{y}">{blocks}</instance>' for x, y, blocks in instances)
    return (f'<!-- {comment} -->\n<block_set xmlns="http://de.fhg.iais.roberta.blockly" robottype="mbot2" '
            f'xmlversion="3.1" description="" tags="">{body}</block_set>\n')

files = {
 'teste-1-variaveis.xml': program(
   'Typed globals: drives each distance in the list, counting laps on the display. '
   'Expected: drives 20, 10, 30 cm turning right 90 after each; display "mBot volta 1..3", then "terminou: true" on row 1.',
   (40, 40, start([('distancias', 'Array_Number', numlist([20, 10, 30])), ('nome', 'String', txt('mBot')),
                   ('voltas', 'Number', num(0)), ('terminou', 'Boolean', boolean('FALSE'))])
      + foreach('d', get('distancias', 'Array_Number'),
                drive(num(30), get('d', 'Number')) + turn(num(30), num(90)) + change('voltas', 1)
                + display(join(get('nome', 'String'), txt(' volta '), get('voltas', 'Number'))))
      + setv('terminou', 'Boolean', boolean('TRUE'))
      + display(join(txt('terminou: '), get('terminou', 'Boolean')), 1))),
 'teste-2-funcao.xml': program(
   'Function with a parameter: draws a 20 cm square, then a 40 cm square.',
   (40, 40, start() + call('quadrado', [('lado', 'Number', num(20))]) + call('quadrado', [('lado', 'Number', num(40))])
      + display(txt('Feito'))),
   (420, 40, defnoreturn('quadrado', [('lado', 'Number')],
      repeat(num(4), drive(num(30), get('lado', 'Number')) + turn(num(30), num(90)))))),
 'teste-3-retorno.xml': program(
   'Functions with return values. Expected: display shows 42, then the robot drives forward and turns right '
   'whenever an obstacle is closer than 15 cm (forever; press Parar).',
   (40, 40, start() + display(callr('dobro', 'Number', [('x', 'Number', num(21))]))
      + forever(if_else(callr('perto', 'Boolean', [('limite', 'Number', num(15))]),
                        stop() + turn(num(30), num(90)), drive_on(num(30))))),
   (420, 40, defreturn('dobro', [('x', 'Number')], 'Number', '', arith('MULTIPLY', get('x', 'Number'), num(2)))),
   (420, 240, defreturn('perto', [('limite', 'Number')], 'Boolean',
      ifreturn(compare('LT', ultrasonic(), get('limite', 'Number')), boolean('TRUE'), 'Boolean'), boolean('FALSE')))),
 'teste-4-erros.xml': program(
   'Deliberate mistakes. Expected warnings: "passos" used outside its function, "i" used outside its loop, '
   '"fantasma" not declared, and "se ... retorna" outside a function. Running it stops with an error.',
   (40, 40, start([('contador', 'Number', num(0))])
      + call('anda', [('passos', 'Number', num(10))])
      + display(get('passos', 'Number'))
      + count('i', 0, 3, change('contador', 1))
      + display(get('i', 'Number'), 1)
      + display(get('fantasma', 'Number'), 2)
      + ifreturn(boolean('TRUE'), num(1), 'Number')),
   (420, 40, defnoreturn('anda', [('passos', 'Number')], drive(num(30), get('passos', 'Number'))))),
}
os.makedirs(out, exist_ok=True)
for name, xml in files.items():
    open(os.path.join(out, name), 'w').write(xml)
    print('wrote', name)
