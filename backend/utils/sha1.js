import { createHash } from "crypto";
export function sha1(input) {
  return createHash('sha1').update(input, 'utf8').digest('hex').toUpperCase();
}