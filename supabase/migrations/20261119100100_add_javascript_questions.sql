-- 45 original JavaScript questions (15 duel, 30 Practice). Source: supabase/questions/catalog.javascript.json.
-- Existing versions are immutable; edit content by adding a new version.
insert into private.questions (slug,version,pool,language,difficulty,title,prompt,code,
  line_count,correct_line,explanation,corrected_code,tags) values
  ('js-sum-readings', '1', 'duel', 'javascript', 'easy', 'Sum the readings', 'Return the sum of all numeric readings; an empty array totals zero.', 'function sumReadings(readings) {
  let total = 0;
  for (const reading of readings) {
    total = reading;
  }
  return total;
}', '7', '4', 'The accumulator is overwritten on every iteration. Add each reading to keep the running total.', 'function sumReadings(readings) {
  let total = 0;
  for (const reading of readings) {
    total += reading;
  }
  return total;
}', array['javascript','sum']::text[]),
  ('js-max-value', '1', 'duel', 'javascript', 'easy', 'Largest value', 'Return the largest number in a nonempty array, including arrays of negative numbers.', 'function maxValue(values) {
  let best = 0;
  for (const value of values) {
    if (value > best) best = value;
  }
  return best;
}', '7', '2', 'Starting from 0 hides negative maxima. Start from the first element instead.', 'function maxValue(values) {
  let best = values[0];
  for (const value of values) {
    if (value > best) best = value;
  }
  return best;
}', array['javascript','maximum']::text[]),
  ('js-is-odd', '1', 'duel', 'javascript', 'easy', 'Detect odd numbers', 'Return true when an integer is odd, including negative integers.', 'function isOdd(n) {
  const remainder = n % 2;
  const odd = remainder === 1;
  return odd;
}', '5', '3', 'In JavaScript the remainder keeps the sign of the dividend, so -3 % 2 is -1. Compare against zero instead.', 'function isOdd(n) {
  const remainder = n % 2;
  const odd = remainder !== 0;
  return odd;
}', array['javascript','parity']::text[]),
  ('js-last-item', '1', 'duel', 'javascript', 'easy', 'Last element', 'Return the last element of a nonempty array.', 'function lastItem(items) {
  const count = items.length;
  const index = count;
  return items[index];
}', '5', '3', 'Array indexes start at zero, so the last valid index is length minus one.', 'function lastItem(items) {
  const count = items.length;
  const index = count - 1;
  return items[index];
}', array['javascript','index']::text[]),
  ('js-capitalize-word', '1', 'duel', 'javascript', 'easy', 'Capitalize a word', 'Return the word with only its first letter converted to uppercase.', 'function capitalize(word) {
  const first = word[0].toUpperCase();
  const rest = word.slice(0);
  return first + rest;
}', '5', '3', 'slice(0) copies the whole word, so the first letter is duplicated. Skip it with slice(1).', 'function capitalize(word) {
  const first = word[0].toUpperCase();
  const rest = word.slice(1);
  return first + rest;
}', array['javascript','string']::text[]),
  ('js-first-negative', '1', 'duel', 'javascript', 'medium', 'First negative index', 'Return the index of the first negative number, or -1 when there is none.', 'function firstNegativeIndex(values) {
  for (let i = 1; i < values.length; i++) {
    if (values[i] < 0) return i;
  }
  return -1;
}', '6', '2', 'The loop starts at index 1 and never inspects the first element.', 'function firstNegativeIndex(values) {
  for (let i = 0; i < values.length; i++) {
    if (values[i] < 0) return i;
  }
  return -1;
}', array['javascript','loop','index']::text[]),
  ('js-unique-sorted', '1', 'duel', 'javascript', 'medium', 'Unique sorted numbers', 'Return the distinct numbers in ascending numeric order.', 'function uniqueSorted(values) {
  const unique = [...new Set(values)];
  unique.sort();
  return unique;
}', '5', '3', 'Without a comparator, sort() compares values as strings, so 10 comes before 9. Pass a numeric comparator.', 'function uniqueSorted(values) {
  const unique = [...new Set(values)];
  unique.sort((a, b) => a - b);
  return unique;
}', array['javascript','sort']::text[]),
  ('js-remove-at', '1', 'duel', 'javascript', 'medium', 'Remove without mutation', 'Return a new array without the element at the index and leave the input unchanged.', 'function removeAt(values, index) {
  const copy = values;
  copy.splice(index, 1);
  return copy;
}', '5', '2', 'Assigning an array copies only the reference, so splice changes the caller''s array. Copy it first.', 'function removeAt(values, index) {
  const copy = [...values];
  copy.splice(index, 1);
  return copy;
}', array['javascript','mutation']::text[]),
  ('js-cart-total', '1', 'duel', 'javascript', 'medium', 'Cart total', 'Return the total cost of cart items, where each item has price and qty.', 'function cartTotal(items) {
  return items.reduce((sum, item) => {
    return sum + item.price;
  }, 0);
}', '5', '3', 'The quantity is ignored, so every item is counted once. Multiply the price by qty.', 'function cartTotal(items) {
  return items.reduce((sum, item) => {
    return sum + item.price * item.qty;
  }, 0);
}', array['javascript','reduce']::text[]),
  ('js-has-char', '1', 'duel', 'javascript', 'medium', 'Contains a character', 'Return true only when the text contains the character.', 'function hasChar(text, ch) {
  if (text.indexOf(ch)) {
    return true;
  }
  return false;
}', '6', '2', 'indexOf returns 0 for a match at the start (falsy) and -1 for no match (truthy). Compare with -1 explicitly.', 'function hasChar(text, ch) {
  if (text.indexOf(ch) !== -1) {
    return true;
  }
  return false;
}', array['javascript','truthiness']::text[]),
  ('js-binary-search', '1', 'duel', 'javascript', 'hard', 'Binary search', 'Return the index of target in a sorted array, or -1 when it is absent.', 'function binarySearch(values, target) {
  let low = 0;
  let high = values.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (values[mid] === target) return mid;
    if (values[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}', '11', '4', 'When low equals high one candidate remains. The strict comparison skips it, so the last element can be missed.', 'function binarySearch(values, target) {
  let low = 0;
  let high = values.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (values[mid] === target) return mid;
    if (values[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}', array['javascript','search','boundary']::text[]),
  ('js-make-getters', '1', 'duel', 'javascript', 'hard', 'Closures in a loop', 'Return one function per element that later returns that element.', 'function makeGetters(values) {
  const getters = [];
  for (var i = 0; i < values.length; i++) {
    getters.push(() => values[i]);
  }
  return getters;
}', '7', '3', 'var is function scoped, so every closure shares one index that ends past the array. let creates a fresh binding per iteration.', 'function makeGetters(values) {
  const getters = [];
  for (let i = 0; i < values.length; i++) {
    getters.push(() => values[i]);
  }
  return getters;
}', array['javascript','closure','scope']::text[]),
  ('js-is-balanced', '1', 'duel', 'javascript', 'hard', 'Balanced parentheses', 'Return true when every opening parenthesis has a matching closing one.', 'function isBalanced(text) {
  const stack = [];
  for (const ch of text) {
    if (ch === ''('') stack.push(ch);
    else if (ch === '')'') {
      if (stack.length === 0) return false;
      stack.pop();
    }
  }
  return true;
}', '11', '10', 'Unclosed opening parentheses remain on the stack. The function must report balance only when the stack is empty.', 'function isBalanced(text) {
  const stack = [];
  for (const ch of text) {
    if (ch === ''('') stack.push(ch);
    else if (ch === '')'') {
      if (stack.length === 0) return false;
      stack.pop();
    }
  }
  return stack.length === 0;
}', array['javascript','stack']::text[]),
  ('js-longest-run', '1', 'duel', 'javascript', 'hard', 'Longest equal run', 'Return the length of the longest run of equal neighbouring values.', 'function longestRun(values) {
  let best = 0;
  let run = 0;
  for (let i = 0; i < values.length; i++) {
    if (i > 0 && values[i] === values[i - 1]) run++;
    else run = 0;
    best = Math.max(best, run);
  }
  return best;
}', '10', '6', 'A new run already contains one element. Resetting to zero undercounts every run by one.', 'function longestRun(values) {
  let best = 0;
  let run = 0;
  for (let i = 0; i < values.length; i++) {
    if (i > 0 && values[i] === values[i - 1]) run++;
    else run = 1;
    best = Math.max(best, run);
  }
  return best;
}', array['javascript','run','reset']::text[]),
  ('js-median', '1', 'duel', 'javascript', 'hard', 'Median', 'Return the median of a nonempty array of numbers.', 'function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return sorted[mid];
  }
  return sorted[mid];
}', '8', '5', 'An even-length array has two middle values. Their average is the median, not just the upper one.', 'function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}', array['javascript','statistics']::text[]),
  ('js-positive-sum', '1', 'practice', 'javascript', 'easy', 'Sum positives', 'Return the sum of strictly positive values.', 'function positiveSum(values) {
  let total = 0;
  for (const value of values) {
    if (value < 0) total += value;
  }
  return total;
}', '7', '4', 'The condition selects negative numbers. It should select values greater than zero.', 'function positiveSum(values) {
  let total = 0;
  for (const value of values) {
    if (value > 0) total += value;
  }
  return total;
}', array['javascript','filter']::text[]),
  ('js-count-vowels', '1', 'practice', 'javascript', 'easy', 'Count lowercase vowels', 'Count every lowercase vowel in a string.', 'function countVowels(text) {
  const matches = text.match(/[aeiou]/);
  const count = matches ? matches.length : 0;
  return count;
}', '5', '2', 'Without the global flag, match returns only the first match with its groups. Add g to collect all matches.', 'function countVowels(text) {
  const matches = text.match(/[aeiou]/g);
  const count = matches ? matches.length : 0;
  return count;
}', array['javascript','regex']::text[]),
  ('js-reverse-text', '1', 'practice', 'javascript', 'easy', 'Reverse a string', 'Return the characters of a string in reverse order.', 'function reverseText(text) {
  const chars = text.split('''');
  chars.reverse();
  return chars.join('' '');
}', '5', '4', 'Joining with a space inserts separators between letters. Join with an empty string.', 'function reverseText(text) {
  const chars = text.split('''');
  chars.reverse();
  return chars.join('''');
}', array['javascript','string']::text[]),
  ('js-is-palindrome', '1', 'practice', 'javascript', 'easy', 'Palindrome check', 'Return true when text reads the same forwards and backwards.', 'function isPalindrome(text) {
  const chars = text.split('''');
  const reversed = chars.reverse();
  return text === reversed;
}', '5', '4', 'A string is never strictly equal to an array. Join the reversed characters before comparing.', 'function isPalindrome(text) {
  const chars = text.split('''');
  const reversed = chars.reverse();
  return text === reversed.join('''');
}', array['javascript','string','equality']::text[]),
  ('js-average', '1', 'practice', 'javascript', 'easy', 'Average', 'Return the arithmetic mean of a nonempty array of numbers.', 'function average(values) {
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total / (values.length - 1);
}', '7', '6', 'The divisor is one too small. Divide by the number of values.', 'function average(values) {
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total / values.length;
}', array['javascript','average']::text[]),
  ('js-clamp-value', '1', 'practice', 'javascript', 'easy', 'Clamp a number', 'Limit a value to the inclusive range from min to max.', 'function clamp(value, min, max) {
  if (value < min) return max;
  if (value > max) return max;
  return value;
}', '5', '2', 'A value below the range should snap to the lower bound, not the upper one.', 'function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}', array['javascript','range']::text[]),
  ('js-repeat-text', '1', 'practice', 'javascript', 'easy', 'Repeat text', 'Return the text repeated exactly times times.', 'function repeatText(text, times) {
  let result = '''';
  for (let i = 0; i <= times; i++) {
    result += text;
  }
  return result;
}', '7', '3', 'With <= the loop runs one extra time. Stop before i reaches times.', 'function repeatText(text, times) {
  let result = '''';
  for (let i = 0; i < times; i++) {
    result += text;
  }
  return result;
}', array['javascript','loop','off-by-one']::text[]),
  ('js-double-all', '1', 'practice', 'javascript', 'easy', 'Double every number', 'Return a new array with every number multiplied by two.', 'function doubleAll(values) {
  return values.map((value) => {
    value * 2;
  });
}', '5', '3', 'A braced arrow function needs an explicit return. Without it, map produces undefined values.', 'function doubleAll(values) {
  return values.map((value) => {
    return value * 2;
  });
}', array['javascript','map']::text[]),
  ('js-min-value', '1', 'practice', 'javascript', 'easy', 'Smallest value', 'Return the smallest number in a nonempty array.', 'function minValue(values) {
  let best = Infinity;
  for (const value of values) {
    if (value > best) best = value;
  }
  return best;
}', '7', '4', 'The comparison is reversed, so the loop never replaces Infinity. Use less than.', 'function minValue(values) {
  let best = Infinity;
  for (const value of values) {
    if (value < best) best = value;
  }
  return best;
}', array['javascript','minimum']::text[]),
  ('js-count-even', '1', 'practice', 'javascript', 'easy', 'Count even numbers', 'Return how many values in the array are even.', 'function countEven(values) {
  let count = 0;
  for (const value of values) {
    if (value % 2 === 0) count = 1;
  }
  return count;
}', '7', '4', 'Assigning 1 means the result can never exceed one. Increment the counter instead.', 'function countEven(values) {
  let count = 0;
  for (const value of values) {
    if (value % 2 === 0) count += 1;
  }
  return count;
}', array['javascript','counter']::text[]),
  ('js-second-largest', '1', 'practice', 'javascript', 'medium', 'Second largest number', 'Return the second largest number in an array of at least two numbers.', 'function secondLargest(values) {
  const sorted = [...values];
  sorted.sort();
  return sorted[sorted.length - 2];
}', '5', '3', 'The default sort is lexicographic, so 100 sorts before 9. Provide a numeric comparator.', 'function secondLargest(values) {
  const sorted = [...values];
  sorted.sort((a, b) => a - b);
  return sorted[sorted.length - 2];
}', array['javascript','sort']::text[]),
  ('js-chunk-array', '1', 'practice', 'javascript', 'medium', 'Split into chunks', 'Split an array into consecutive chunks of the given size.', 'function chunk(values, size) {
  const result = [];
  for (let i = 0; i < values.length; i += size) {
    result.push(values.slice(i, size));
  }
  return result;
}', '7', '4', 'slice takes an end index, not a length. After the first chunk the end must move forward with i.', 'function chunk(values, size) {
  const result = [];
  for (let i = 0; i < values.length; i += size) {
    result.push(values.slice(i, i + size));
  }
  return result;
}', array['javascript','slice']::text[]),
  ('js-sum-digits', '1', 'practice', 'javascript', 'medium', 'Sum of digits', 'Return the sum of the decimal digits of a nonnegative integer.', 'function sumDigits(n) {
  let total = 0;
  while (n > 0) {
    total += n % 10;
    n = n / 10;
  }
  return total;
}', '8', '5', 'Division in JavaScript is not integer division. Floor the quotient or the number keeps a fraction.', 'function sumDigits(n) {
  let total = 0;
  while (n > 0) {
    total += n % 10;
    n = Math.floor(n / 10);
  }
  return total;
}', array['javascript','division']::text[]),
  ('js-with-defaults', '1', 'practice', 'javascript', 'medium', 'Apply default options', 'Return options merged over defaults so caller values win.', 'function withDefaults(options, defaults) {
  const base = { ...defaults };
  const merged = { ...options, ...base };
  return merged;
}', '5', '3', 'Later spread entries overwrite earlier ones. The caller''s options must come last.', 'function withDefaults(options, defaults) {
  const base = { ...defaults };
  const merged = { ...base, ...options };
  return merged;
}', array['javascript','object','spread']::text[]),
  ('js-word-count', '1', 'practice', 'javascript', 'medium', 'Count words', 'Count words separated by any amount of whitespace.', 'function wordCount(text) {
  const trimmed = text.trim();
  if (trimmed === '''') return 0;
  return trimmed.split('' '').length;
}', '5', '4', 'Splitting on one space creates empty entries for repeated spaces. Split on a whitespace pattern.', 'function wordCount(text) {
  const trimmed = text.trim();
  if (trimmed === '''') return 0;
  return trimmed.split(/\s+/).length;
}', array['javascript','regex','string']::text[]),
  ('js-is-sorted', '1', 'practice', 'javascript', 'medium', 'Ascending order check', 'Return true when numbers are in nondecreasing order.', 'function isSorted(values) {
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) return false;
  }
  return true;
}', '6', '3', 'The comparison rejects ascending pairs. A violation is a value smaller than its predecessor.', 'function isSorted(values) {
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[i - 1]) return false;
  }
  return true;
}', array['javascript','comparison']::text[]),
  ('js-rotate-left', '1', 'practice', 'javascript', 'medium', 'Rotate left', 'Rotate an array left by k positions without losing elements.', 'function rotateLeft(values, k) {
  const n = values.length;
  const shift = k % n;
  return values.slice(shift).concat(values.slice(0, shift - 1));
}', '5', '4', 'The tail concatenation stops one element early, so an element disappears.', 'function rotateLeft(values, k) {
  const n = values.length;
  const shift = k % n;
  return values.slice(shift).concat(values.slice(0, shift));
}', array['javascript','slice']::text[]),
  ('js-has-key', '1', 'practice', 'javascript', 'medium', 'Own key check', 'Return true when an object has the key, even when its value is falsy.', 'function hasKey(obj, key) {
  if (obj[key]) {
    return true;
  }
  return false;
}', '6', '2', 'Checking the value fails for 0, empty strings and false. Test for the key itself.', 'function hasKey(obj, key) {
  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    return true;
  }
  return false;
}', array['javascript','object','truthiness']::text[]),
  ('js-inclusive-range', '1', 'practice', 'javascript', 'medium', 'Inclusive range', 'Return every integer from start to end, including both ends.', 'function range(start, end) {
  const result = [];
  for (let i = start; i < end; i++) {
    result.push(i);
  }
  return result;
}', '7', '3', 'The strict comparison leaves out the final number. Use <= to include it.', 'function range(start, end) {
  const result = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }
  return result;
}', array['javascript','loop','off-by-one']::text[]),
  ('js-capitalize-words', '1', 'practice', 'javascript', 'medium', 'Capitalize each word', 'Capitalize the first letter of every space separated word.', 'function capitalizeWords(text) {
  return text
    .split('' '')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('''');
}', '6', '5', 'Joining with an empty string removes the spaces between words.', 'function capitalizeWords(text) {
  return text
    .split('' '')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('' '');
}', array['javascript','string','array']::text[]),
  ('js-fibonacci', '1', 'practice', 'javascript', 'hard', 'Fibonacci number', 'Return the nth Fibonacci number where fibonacci(0) is 0 and fibonacci(1) is 1.', 'function fibonacci(n) {
  if (n <= 1) return n;
  let previous = 0;
  let current = 1;
  for (let i = 2; i <= n; i++) {
    const next = previous + current;
    previous = current;
    current = previous;
  }
  return current;
}', '11', '8', 'After previous is replaced, current is assigned that same value. The new term next is lost.', 'function fibonacci(n) {
  if (n <= 1) return n;
  let previous = 0;
  let current = 1;
  for (let i = 2; i <= n; i++) {
    const next = previous + current;
    previous = current;
    current = next;
  }
  return current;
}', array['javascript','iteration','state']::text[]),
  ('js-merge-sorted', '1', 'practice', 'javascript', 'hard', 'Merge sorted arrays', 'Merge two ascending arrays into one ascending array.', 'function mergeSorted(left, right) {
  const result = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]);
    else result.push(right[j++]);
  }
  return result.concat(left.slice(i));
}', '10', '9', 'When one side is exhausted the other may still have elements. Append both remainders.', 'function mergeSorted(left, right) {
  const result = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]);
    else result.push(right[j++]);
  }
  return result.concat(left.slice(i), right.slice(j));
}', array['javascript','merge','two-pointers']::text[]),
  ('js-first-unique', '1', 'practice', 'javascript', 'hard', 'First unique character', 'Return the first character that appears exactly once, or null.', 'function firstUnique(text) {
  const counts = {};
  for (const ch of text) {
    counts[ch] = (counts[ch] || 0) + 1;
  }
  for (const ch of text) {
    if (counts[ch] > 1) return ch;
  }
  return null;
}', '10', '7', 'The second loop returns the first repeated character. It must return the first one counted once.', 'function firstUnique(text) {
  const counts = {};
  for (const ch of text) {
    counts[ch] = (counts[ch] || 0) + 1;
  }
  for (const ch of text) {
    if (counts[ch] === 1) return ch;
  }
  return null;
}', array['javascript','counting']::text[]),
  ('js-two-sum', '1', 'practice', 'javascript', 'hard', 'Two sum', 'Return the indexes of two different elements that add up to target, or null.', 'function twoSum(values, target) {
  const seen = new Map();
  for (let i = 0; i < values.length; i++) {
    const need = target - values[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(need, i);
  }
  return null;
}', '9', '6', 'The map must remember the values already visited, not the values still needed.', 'function twoSum(values, target) {
  const seen = new Map();
  for (let i = 0; i < values.length; i++) {
    const need = target - values[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(values[i], i);
  }
  return null;
}', array['javascript','map','lookup']::text[]),
  ('js-group-by-length', '1', 'practice', 'javascript', 'hard', 'Group words by length', 'Group words into arrays keyed by their length.', 'function groupByLength(words) {
  const groups = {};
  for (const word of words) {
    const key = word.length;
    if (!groups[key]) groups[key] = [];
    groups[key] = word;
  }
  return groups;
}', '9', '6', 'The group array is replaced by a single word on every iteration. Push the word into the group instead.', 'function groupByLength(words) {
  const groups = {};
  for (const word of words) {
    const key = word.length;
    if (!groups[key]) groups[key] = [];
    groups[key].push(word);
  }
  return groups;
}', array['javascript','object','grouping']::text[]),
  ('js-sum-async', '1', 'practice', 'javascript', 'hard', 'Sum async values', 'Await every asynchronous load and return the total.', 'async function sumAsync(values, load) {
  let total = 0;
  for (const value of values) {
    total += load(value);
  }
  return total;
}', '7', '4', 'load returns a promise. Without await the promise is added to the number instead of its result.', 'async function sumAsync(values, load) {
  let total = 0;
  for (const value of values) {
    total += await load(value);
  }
  return total;
}', array['javascript','async','promise']::text[]),
  ('js-create-counter', '1', 'practice', 'javascript', 'hard', 'Counter closure', 'Return a counter whose value() reads the count without changing it.', 'function createCounter() {
  let count = 0;
  return {
    increment() {
      count++;
    },
    value() {
      return count++;
    },
  };
}', '11', '8', 'Reading the value also increments it, so every read changes the result. A getter must be free of side effects.', 'function createCounter() {
  let count = 0;
  return {
    increment() {
      count++;
    },
    value() {
      return count;
    },
  };
}', array['javascript','closure','side-effect']::text[]),
  ('js-dedupe-first', '1', 'practice', 'javascript', 'hard', 'Remove duplicates', 'Remove repeated values but keep the first occurrence of each value in order.', 'function dedupe(values) {
  return values.filter(
    (value, index) => values.indexOf(value) === values.lastIndexOf(value)
  );
}', '5', '3', 'The predicate drops every value that appears more than once. Keep an element only at its first index.', 'function dedupe(values) {
  return values.filter(
    (value, index) => values.indexOf(value) === index
  );
}', array['javascript','filter']::text[]),
  ('js-to-numbers', '1', 'practice', 'javascript', 'hard', 'Parse integers', 'Convert numeric strings to base 10 integers and drop invalid ones.', 'function toNumbers(items) {
  const numbers = items.map(parseInt);
  return numbers.filter(
    (value) => !Number.isNaN(value)
  );
}', '6', '2', 'map passes the index as the second argument, which parseInt treats as the radix. Wrap the call and pass 10.', 'function toNumbers(items) {
  const numbers = items.map((item) => parseInt(item, 10));
  return numbers.filter(
    (value) => !Number.isNaN(value)
  );
}', array['javascript','parse','callback']::text[]),
  ('js-sort-by-age', '1', 'practice', 'javascript', 'hard', 'Sort people by age', 'Return a new array of people sorted by ascending age.', 'function sortByAge(people) {
  const copy = [...people];
  copy.sort((a, b) => a.age > b.age);
  return copy;
}', '5', '3', 'A comparator must return a negative, zero or positive number. A boolean never signals that a should come first.', 'function sortByAge(people) {
  const copy = [...people];
  copy.sort((a, b) => a.age - b.age);
  return copy;
}', array['javascript','sort','comparator']::text[])
on conflict (slug,version) do update set
  pool = excluded.pool,
  language = excluded.language,
  difficulty = excluded.difficulty,
  title = excluded.title,
  prompt = excluded.prompt,
  code = excluded.code,
  line_count = excluded.line_count,
  correct_line = excluded.correct_line,
  explanation = excluded.explanation,
  corrected_code = excluded.corrected_code,
  tags = excluded.tags;
