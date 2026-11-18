// In the repo this re-exports the server's hashing; `npm run turmas:install` copies
// server/password.js over it on the shared drive, so both always hash the same way.
export * from '../../server/password.js';
