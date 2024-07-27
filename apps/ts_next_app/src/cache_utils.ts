import { createHash } from 'crypto';

// Function to convert dictionary to sorted array of key-value pairs
export function convert_and_sort_dictionary(args: object): [string, any][] {
  const key_value_pairs = Object.entries(args);
  key_value_pairs.sort(([key1, _], [key2, __]) => key1.localeCompare(key2));
  return key_value_pairs;
}

// Function to stringify sorted key-value pairs
function stringify_key_value_pairs(pairs: [string, any][]): string {
  return JSON.stringify(pairs);
}

// Function to generate hash from stringified key-value pairs
function generate_hash_from_string(data: string): string {
  const hash = createHash('md5');
  hash.update(data);
  return hash.digest('hex');
}

// Complete function to handle the entire process
function generate_args_hash(args: object): string {
  const sorted_pairs = convert_and_sort_dictionary(args);
  const stringified_pairs = stringify_key_value_pairs(sorted_pairs);
  return generate_hash_from_string(stringified_pairs);
}
