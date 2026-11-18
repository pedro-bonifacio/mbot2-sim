// Cloudflare Pages Function: every /api/* request goes to server/api.js (decision 0016).
import { handle } from '../../server/api.js';

export const onRequest = ({ request, env }) => handle(request, env);
