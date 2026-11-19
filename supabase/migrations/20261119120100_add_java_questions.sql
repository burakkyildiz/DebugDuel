-- 45 original Java questions (15 duel, 30 Practice). Source: supabase/questions/catalog.java.json.
-- Existing versions are immutable; edit content by adding a new version.
insert into private.questions (slug,version,pool,language,difficulty,title,prompt,code,
  line_count,correct_line,explanation,corrected_code,tags) values
  ('java-sum-readings', '1', 'duel', 'java', 'easy', 'Sum the readings', 'Return the sum of all readings; an empty array totals zero.', 'static int sumReadings(int[] readings) {
  int total = 0;
  for (int reading : readings) {
    total = reading;
  }
  return total;
}', '7', '4', 'The accumulator is overwritten on every pass. Add each reading to keep the running total.', 'static int sumReadings(int[] readings) {
  int total = 0;
  for (int reading : readings) {
    total += reading;
  }
  return total;
}', array['java','sum']::text[]),
  ('java-largest-value', '1', 'duel', 'java', 'easy', 'Largest value', 'Return the largest value in a non-empty array, including when every value is negative.', 'static int largest(int[] values) {
  int best = 0;
  for (int value : values) {
    if (value > best) best = value;
  }
  return best;
}', '7', '2', 'Starting at zero beats every negative value. Start from the first element instead.', 'static int largest(int[] values) {
  int best = values[0];
  for (int value : values) {
    if (value > best) best = value;
  }
  return best;
}', array['java','max']::text[]),
  ('java-count-vowels', '1', 'duel', 'java', 'easy', 'Count the vowels', 'Count the vowels in the text, ignoring case.', 'static int countVowels(String text) {
  int count = 0;
  for (char c : text.toLowerCase().toCharArray()) {
    if ("aeiou".indexOf(c) > 0) count++;
  }
  return count;
}', '7', '4', 'indexOf returns 0 for the first vowel, so the check must accept zero. Use >= 0.', 'static int countVowels(String text) {
  int count = 0;
  for (char c : text.toLowerCase().toCharArray()) {
    if ("aeiou".indexOf(c) >= 0) count++;
  }
  return count;
}', array['java','strings']::text[]),
  ('java-average', '1', 'duel', 'java', 'easy', 'Average of scores', 'Return the exact average of the scores as a double.', 'static double average(int[] values) {
  int sum = 0;
  for (int value : values) sum += value;
  return sum / values.length;
}', '5', '4', 'Dividing two ints truncates the fraction. Convert one operand to double first.', 'static double average(int[] values) {
  int sum = 0;
  for (int value : values) sum += value;
  return (double) sum / values.length;
}', array['java','math']::text[]),
  ('java-reverse-text', '1', 'duel', 'java', 'easy', 'Reverse the text', 'Return the characters of the text in reverse order.', 'static String reverse(String text) {
  StringBuilder out = new StringBuilder();
  for (int i = text.length() - 1; i > 0; i--) {
    out.append(text.charAt(i));
  }
  return out.toString();
}', '7', '3', 'The loop stops before index 0, dropping the first character. Include index 0.', 'static String reverse(String text) {
  StringBuilder out = new StringBuilder();
  for (int i = text.length() - 1; i >= 0; i--) {
    out.append(text.charAt(i));
  }
  return out.toString();
}', array['java','strings']::text[]),
  ('java-is-palindrome', '1', 'duel', 'java', 'medium', 'Palindrome check', 'Return true when the text reads the same backwards, ignoring case and punctuation.', 'static boolean isPalindrome(String text) {
  String cleaned = text.toLowerCase().replaceAll("[^a-z0-9]", "");
  String reversed = new StringBuilder(cleaned).reverse().toString();
  return cleaned == reversed;
}', '5', '4', '== compares object identity, and the reversed string is a new object. Compare the contents with equals.', 'static boolean isPalindrome(String text) {
  String cleaned = text.toLowerCase().replaceAll("[^a-z0-9]", "");
  String reversed = new StringBuilder(cleaned).reverse().toString();
  return cleaned.equals(reversed);
}', array['java','strings','equality']::text[]),
  ('java-binary-search', '1', 'duel', 'java', 'medium', 'Binary search', 'Return the index of the target in a sorted array, or -1 when it is missing.', 'static int indexOf(int[] sorted, int target) {
  int low = 0, high = sorted.length - 1;
  while (low < high) {
    int mid = (low + high) / 2;
    if (sorted[mid] == target) return mid;
    if (sorted[mid] < target) low = mid + 1; else high = mid - 1;
  }
  return -1;
}', '9', '3', 'The loop quits while one candidate is still unchecked. Keep searching while low <= high.', 'static int indexOf(int[] sorted, int target) {
  int low = 0, high = sorted.length - 1;
  while (low <= high) {
    int mid = (low + high) / 2;
    if (sorted[mid] == target) return mid;
    if (sorted[mid] < target) low = mid + 1; else high = mid - 1;
  }
  return -1;
}', array['java','search']::text[]),
  ('java-unique-values', '1', 'duel', 'java', 'medium', 'Unique values in order', 'Return the values with duplicates removed, keeping the first occurrence order.', 'static List<Integer> unique(int[] values) {
  Set<Integer> seen = new HashSet<>();
  List<Integer> result = new ArrayList<>();
  for (int value : values) {
    if (!seen.add(value)) result.add(value);
  }
  return result;
}', '8', '5', 'Set.add returns true only for a new value. Keep the value when add succeeds, not when it fails.', 'static List<Integer> unique(int[] values) {
  Set<Integer> seen = new HashSet<>();
  List<Integer> result = new ArrayList<>();
  for (int value : values) {
    if (seen.add(value)) result.add(value);
  }
  return result;
}', array['java','collections']::text[]),
  ('java-word-count', '1', 'duel', 'java', 'medium', 'Count the words', 'Count the words in a sentence separated by any amount of whitespace.', 'static int wordCount(String text) {
  String trimmed = text.trim();
  if (trimmed.isEmpty()) return 0;
  return trimmed.split(" ").length;
}', '5', '4', 'Splitting on a single space turns repeated spaces into empty words. Split on one or more whitespace characters.', 'static int wordCount(String text) {
  String trimmed = text.trim();
  if (trimmed.isEmpty()) return 0;
  return trimmed.split("\\s+").length;
}', array['java','strings','regex']::text[]),
  ('java-all-equal', '1', 'duel', 'java', 'medium', 'All scores equal', 'Return true when every score in the list is the same value.', 'static boolean allEqual(List<Integer> scores) {
  if (scores.isEmpty()) return true;
  Integer first = scores.get(0);
  for (Integer score : scores) {
    if (score != first) return false;
  }
  return true;
}', '8', '5', 'For boxed Integers, != compares references and only looks right for small cached values. Compare with equals.', 'static boolean allEqual(List<Integer> scores) {
  if (scores.isEmpty()) return true;
  Integer first = scores.get(0);
  for (Integer score : scores) {
    if (!score.equals(first)) return false;
  }
  return true;
}', array['java','boxing','equality']::text[]),
  ('java-remove-negatives', '1', 'duel', 'java', 'hard', 'Remove the negatives', 'Return a copy of the list without its negative numbers.', 'static List<Integer> removeNegatives(List<Integer> values) {
  List<Integer> copy = new ArrayList<>(values);
  for (Integer value : copy) {
    if (value < 0) copy.remove(value);
  }
  return copy;
}', '7', '3', 'Removing from the list you are iterating throws ConcurrentModificationException. Iterate the original and edit the copy.', 'static List<Integer> removeNegatives(List<Integer> values) {
  List<Integer> copy = new ArrayList<>(values);
  for (Integer value : values) {
    if (value < 0) copy.remove(value);
  }
  return copy;
}', array['java','collections','iteration']::text[]),
  ('java-caesar-shift', '1', 'duel', 'java', 'hard', 'Caesar shift', 'Shift lowercase letters by the given amount, wrapping around the alphabet; the shift may be negative.', 'static String caesar(String text, int shift) {
  StringBuilder out = new StringBuilder();
  for (char c : text.toCharArray()) {
    if (Character.isLowerCase(c)) {
      out.append((char) (''a'' + (c - ''a'' + shift) % 26));
    } else out.append(c);
  }
  return out.toString();
}', '9', '5', 'The % operator keeps the sign of the dividend, so a negative shift goes below zero. Use Math.floorMod to wrap.', 'static String caesar(String text, int shift) {
  StringBuilder out = new StringBuilder();
  for (char c : text.toCharArray()) {
    if (Character.isLowerCase(c)) {
      out.append((char) (''a'' + Math.floorMod(c - ''a'' + shift, 26)));
    } else out.append(c);
  }
  return out.toString();
}', array['java','math','modulo']::text[]),
  ('java-count-words-map', '1', 'duel', 'java', 'hard', 'Count occurrences', 'Return how many times the target appears in the list of words.', 'static int countWords(List<String> words, String target) {
  Map<String, Integer> counts = new HashMap<>();
  for (String word : words) {
    counts.put(word, counts.get(word) + 1);
  }
  return counts.getOrDefault(target, 0);
}', '7', '4', 'get returns null for a word that has not been counted yet, and unboxing it throws NullPointerException. Default to zero.', 'static int countWords(List<String> words, String target) {
  Map<String, Integer> counts = new HashMap<>();
  for (String word : words) {
    counts.put(word, counts.getOrDefault(word, 0) + 1);
  }
  return counts.getOrDefault(target, 0);
}', array['java','maps','null']::text[]),
  ('java-shout', '1', 'duel', 'java', 'hard', 'Shout it', 'Trim the text, convert it to upper case and add an exclamation mark.', 'static String shout(String text) {
  String result = text.trim();
  result.toUpperCase();
  return result + "!";
}', '5', '3', 'Strings are immutable, so toUpperCase returns a new string that this line throws away. Assign the result.', 'static String shout(String text) {
  String result = text.trim();
  result = result.toUpperCase();
  return result + "!";
}', array['java','strings','immutability']::text[]),
  ('java-total-bytes', '1', 'duel', 'java', 'hard', 'Total bytes', 'Return the total number of bytes for the file sizes, which can exceed the int range.', 'static long totalBytes(int[] sizes) {
  int total = 0;
  for (int size : sizes) {
    total += size;
  }
  return total;
}', '7', '2', 'An int accumulator overflows silently before it is widened to long on return. Accumulate in a long.', 'static long totalBytes(int[] sizes) {
  long total = 0;
  for (int size : sizes) {
    total += size;
  }
  return total;
}', array['java','overflow']::text[]),
  ('java-smallest-value', '1', 'practice', 'java', 'easy', 'Smallest value', 'Return the smallest value in a non-empty array.', 'static int smallest(int[] values) {
  int best = 0;
  for (int value : values) {
    if (value < best) best = value;
  }
  return best;
}', '7', '2', 'Starting at zero hides every positive value. Start from the first element.', 'static int smallest(int[] values) {
  int best = values[0];
  for (int value : values) {
    if (value < best) best = value;
  }
  return best;
}', array['java','min']::text[]),
  ('java-count-even', '1', 'practice', 'java', 'easy', 'Count even numbers', 'Count how many numbers in the array are even.', 'static int countEven(int[] values) {
  int count = 0;
  for (int value : values) {
    if (value % 2 == 1) count++;
  }
  return count;
}', '7', '4', 'The test counts odd numbers. An even number leaves a remainder of 0.', 'static int countEven(int[] values) {
  int count = 0;
  for (int value : values) {
    if (value % 2 == 0) count++;
  }
  return count;
}', array['java','math']::text[]),
  ('java-clamp-value', '1', 'practice', 'java', 'easy', 'Clamp a value', 'Limit the value to the range from low to high.', 'static int clamp(int value, int low, int high) {
  if (value < low) return low;
  if (value > high) return low;
  return value;
}', '5', '3', 'Values above the range should be capped at the upper bound, not the lower one.', 'static int clamp(int value, int low, int high) {
  if (value < low) return low;
  if (value > high) return high;
  return value;
}', array['java','range']::text[]),
  ('java-factorial', '1', 'practice', 'java', 'easy', 'Factorial', 'Return n! for n of zero or more.', 'static long factorial(int n) {
  long result = 1;
  for (int i = 1; i < n; i++) {
    result *= i;
  }
  return result;
}', '7', '3', 'The loop never multiplies by n itself. Include n in the range.', 'static long factorial(int n) {
  long result = 1;
  for (int i = 1; i <= n; i++) {
    result *= i;
  }
  return result;
}', array['java','loops']::text[]),
  ('java-last-letter', '1', 'practice', 'java', 'easy', 'Last letter', 'Return the last non-space character of the text, or ? when the text is blank.', 'static char lastLetter(String text) {
  String trimmed = text.trim();
  if (trimmed.isEmpty()) return ''?'';
  return trimmed.charAt(trimmed.length());
}', '5', '4', 'Valid indexes end at length - 1, so charAt(length) is out of bounds.', 'static char lastLetter(String text) {
  String trimmed = text.trim();
  if (trimmed.isEmpty()) return ''?'';
  return trimmed.charAt(trimmed.length() - 1);
}', array['java','strings','index']::text[]),
  ('java-to-fahrenheit', '1', 'practice', 'java', 'easy', 'Celsius to Fahrenheit', 'Convert a temperature from Celsius to Fahrenheit.', 'static double toFahrenheit(double celsius) {
  double ratio = 9 / 5;
  double scaled = celsius * ratio;
  return scaled + 32;
}', '5', '2', '9 / 5 is integer division and equals 1. Use a floating-point ratio.', 'static double toFahrenheit(double celsius) {
  double ratio = 9.0 / 5;
  double scaled = celsius * ratio;
  return scaled + 32;
}', array['java','math']::text[]),
  ('java-count-char', '1', 'practice', 'java', 'easy', 'Count a character', 'Count how many times the character appears in the text.', 'static int countChar(String text, char target) {
  int count = 0;
  for (int i = 0; i < text.length(); i++) {
    if (text.charAt(i) != target) count++;
  }
  return count;
}', '7', '4', 'The condition counts every other character. Count the characters that equal the target.', 'static int countChar(String text, char target) {
  int count = 0;
  for (int i = 0; i < text.length(); i++) {
    if (text.charAt(i) == target) count++;
  }
  return count;
}', array['java','strings']::text[]),
  ('java-is-sorted', '1', 'practice', 'java', 'easy', 'Is it sorted?', 'Return true when the array is in ascending order.', 'static boolean isSorted(int[] values) {
  for (int i = 1; i <= values.length; i++) {
    if (values[i - 1] > values[i]) return false;
  }
  return true;
}', '6', '2', 'The last pass reads values[length], past the end of the array. Stop before the length.', 'static boolean isSorted(int[] values) {
  for (int i = 1; i < values.length; i++) {
    if (values[i - 1] > values[i]) return false;
  }
  return true;
}', array['java','arrays','bounds']::text[]),
  ('java-sum-of-squares', '1', 'practice', 'java', 'easy', 'Sum of squares', 'Return the sum of the squares of the values.', 'static int sumOfSquares(int[] values) {
  int total = 0;
  for (int value : values) {
    total += value * 2;
  }
  return total;
}', '7', '4', 'Multiplying by 2 doubles the value instead of squaring it. Multiply the value by itself.', 'static int sumOfSquares(int[] values) {
  int total = 0;
  for (int value : values) {
    total += value * value;
  }
  return total;
}', array['java','math']::text[]),
  ('java-leap-year', '1', 'practice', 'java', 'easy', 'Leap year', 'Return true for leap years: divisible by 4, except centuries that are not divisible by 400.', 'static boolean isLeapYear(int year) {
  if (year % 400 == 0) return true;
  if (year % 100 == 0) return false;
  return year % 4 != 0;
}', '5', '4', 'A year divisible by 4 is a leap year, but this returns true for the years that are not.', 'static boolean isLeapYear(int year) {
  if (year % 400 == 0) return true;
  if (year % 100 == 0) return false;
  return year % 4 == 0;
}', array['java','dates']::text[]),
  ('java-fibonacci', '1', 'practice', 'java', 'medium', 'Fibonacci number', 'Return the n-th Fibonacci number, where fibonacci(0) is 0 and fibonacci(1) is 1.', 'static int fibonacci(int n) {
  int previous = 0, current = 1;
  for (int i = 0; i < n; i++) {
    int next = previous + current;
    previous = current;
    current = next;
  }
  return current;
}', '9', '8', 'After n steps the value we want is in previous; current is already one step ahead.', 'static int fibonacci(int n) {
  int previous = 0, current = 1;
  for (int i = 0; i < n; i++) {
    int next = previous + current;
    previous = current;
    current = next;
  }
  return previous;
}', array['java','loops']::text[]),
  ('java-contains-ignore-case', '1', 'practice', 'java', 'medium', 'Contains, ignoring case', 'Return true when the text contains the part, ignoring letter case.', 'static boolean containsIgnoreCase(String text, String part) {
  if (part.isEmpty()) return true;
  String haystack = text.toLowerCase();
  String needle = part;
  return haystack.contains(needle);
}', '6', '4', 'Only the text is lowered, so a search term with capitals never matches. Lower the term too.', 'static boolean containsIgnoreCase(String text, String part) {
  if (part.isEmpty()) return true;
  String haystack = text.toLowerCase();
  String needle = part.toLowerCase();
  return haystack.contains(needle);
}', array['java','strings']::text[]),
  ('java-remove-value', '1', 'practice', 'java', 'medium', 'Remove a value', 'Return a copy of the list without the first occurrence of the target value.', 'static List<Integer> removeValue(List<Integer> values, int target) {
  List<Integer> copy = new ArrayList<>(values);
  copy.remove(target);
  return copy;
}', '5', '3', 'With an int argument, remove(int) deletes by index. Box the value to remove by content.', 'static List<Integer> removeValue(List<Integer> values, int target) {
  List<Integer> copy = new ArrayList<>(values);
  copy.remove(Integer.valueOf(target));
  return copy;
}', array['java','collections','overloads']::text[]),
  ('java-rotate-left', '1', 'practice', 'java', 'medium', 'Rotate left', 'Return a new array with the values rotated left by k positions.', 'static int[] rotateLeft(int[] values, int k) {
  int n = values.length;
  int[] result = new int[n];
  for (int i = 0; i < n; i++) {
    result[(i + k) % n] = values[i];
  }
  return result;
}', '8', '5', 'Writing to (i + k) rotates the values right. Read from (i + k) to rotate left.', 'static int[] rotateLeft(int[] values, int k) {
  int n = values.length;
  int[] result = new int[n];
  for (int i = 0; i < n; i++) {
    result[i] = values[(i + k) % n];
  }
  return result;
}', array['java','arrays']::text[]),
  ('java-balanced-parens', '1', 'practice', 'java', 'medium', 'Balanced parentheses', 'Return true when every parenthesis is closed in the right order.', 'static boolean balanced(String text) {
  int depth = 0;
  for (char c : text.toCharArray()) {
    if (c == ''('') depth++;
    if (c == '')'') depth--;
  }
  return depth == 0;
}', '8', '5', 'A closing parenthesis before any opening one must fail immediately, even if the counts match at the end.', 'static boolean balanced(String text) {
  int depth = 0;
  for (char c : text.toCharArray()) {
    if (c == ''('') depth++;
    if (c == '')'' && --depth < 0) return false;
  }
  return depth == 0;
}', array['java','stack']::text[]),
  ('java-apply-discount', '1', 'practice', 'java', 'medium', 'Apply a discount', 'Reduce the price by the percentage and round to two decimals.', 'static double applyDiscount(double price, int percent) {
  if (percent <= 0) return price;
  double factor = 1 - percent / 100;
  double result = price * factor;
  return Math.round(result * 100) / 100.0;
}', '6', '3', 'percent / 100 is integer division and becomes 0, so no discount is applied. Divide by 100.0.', 'static double applyDiscount(double price, int percent) {
  if (percent <= 0) return price;
  double factor = 1 - percent / 100.0;
  double result = price * factor;
  return Math.round(result * 100) / 100.0;
}', array['java','math']::text[]),
  ('java-value-after-equals', '1', 'practice', 'java', 'medium', 'Value after the equals sign', 'Return the text after the first = sign, or an empty string when there is none.', 'static String valueAfterEquals(String line) {
  int at = line.indexOf(''='');
  if (at < 0) return "";
  return line.substring(at);
}', '5', '4', 'substring(at) still includes the = sign. Start one character later.', 'static String valueAfterEquals(String line) {
  int at = line.indexOf(''='');
  if (at < 0) return "";
  return line.substring(at + 1);
}', array['java','strings','parsing']::text[]),
  ('java-count-pairs', '1', 'practice', 'java', 'medium', 'Count pairs', 'Count the pairs of different positions whose values add up to the target.', 'static int countPairs(int[] values, int target) {
  int pairs = 0;
  for (int i = 0; i < values.length; i++) {
    for (int j = i; j < values.length; j++) {
      if (values[i] + values[j] == target) pairs++;
    }
  }
  return pairs;
}', '9', '4', 'Starting j at i pairs each value with itself. A pair needs two different positions.', 'static int countPairs(int[] values, int target) {
  int pairs = 0;
  for (int i = 0; i < values.length; i++) {
    for (int j = i + 1; j < values.length; j++) {
      if (values[i] + values[j] == target) pairs++;
    }
  }
  return pairs;
}', array['java','loops']::text[]),
  ('java-capitalize-words', '1', 'practice', 'java', 'medium', 'Capitalize words', 'Capitalize the first letter of every word.', 'static String capitalize(String text) {
  StringBuilder out = new StringBuilder();
  boolean start = true;
  for (char c : text.toCharArray()) {
    out.append(start ? Character.toUpperCase(c) : c);
    start = c != '' '';
  }
  return out.toString();
}', '9', '6', 'The flag is inverted: only the character after a space should start a new word.', 'static String capitalize(String text) {
  StringBuilder out = new StringBuilder();
  boolean start = true;
  for (char c : text.toCharArray()) {
    out.append(start ? Character.toUpperCase(c) : c);
    start = c == '' '';
  }
  return out.toString();
}', array['java','strings']::text[]),
  ('java-total-length', '1', 'practice', 'java', 'medium', 'Total length', 'Add up the lengths of the items; null entries count as zero.', 'static int totalLength(List<String> items) {
  int total = 0;
  for (String item : items) {
    total += item.length();
  }
  return total;
}', '7', '4', 'Calling length on a null entry throws NullPointerException. Skip null items.', 'static int totalLength(List<String> items) {
  int total = 0;
  for (String item : items) {
    if (item != null) total += item.length();
  }
  return total;
}', array['java','null']::text[]),
  ('java-sort-ascending', '1', 'practice', 'java', 'hard', 'Sort ascending', 'Return the values sorted in ascending order, for any int values.', 'static int[] sortAscending(int[] values) {
  Integer[] boxed = Arrays.stream(values).boxed().toArray(Integer[]::new);
  Arrays.sort(boxed, (a, b) -> a - b);
  return Arrays.stream(boxed).mapToInt(Integer::intValue).toArray();
}', '5', '3', 'Subtracting two ints can overflow and flip the sign. Use Integer.compare for the comparison.', 'static int[] sortAscending(int[] values) {
  Integer[] boxed = Arrays.stream(values).boxed().toArray(Integer[]::new);
  Arrays.sort(boxed, (a, b) -> Integer.compare(a, b));
  return Arrays.stream(boxed).mapToInt(Integer::intValue).toArray();
}', array['java','sorting','overflow']::text[]),
  ('java-chunk-list', '1', 'practice', 'java', 'hard', 'Split into chunks', 'Split the list into consecutive chunks of the given size; the last chunk may be shorter.', 'static List<List<Integer>> chunks(List<Integer> values, int size) {
  List<List<Integer>> result = new ArrayList<>();
  for (int i = 0; i < values.size(); i += size) {
    result.add(values.subList(i, i + size));
  }
  return result;
}', '7', '4', 'The final chunk ends past the list size, which throws. Clamp the end index to the size.', 'static List<List<Integer>> chunks(List<Integer> values, int size) {
  List<List<Integer>> result = new ArrayList<>();
  for (int i = 0; i < values.size(); i += size) {
    result.add(values.subList(i, Math.min(i + size, values.size())));
  }
  return result;
}', array['java','collections','bounds']::text[]),
  ('java-tier-bonus', '1', 'practice', 'java', 'hard', 'Tier bonus', 'Return 50 points for gold, 20 for silver, 5 for bronze and 0 for anything else.', 'static int bonus(String tier) {
  int points = 0;
  switch (tier) {
    case "gold": points += 50; break;
    case "silver": points += 20;
    case "bronze": points += 5; break;
  }
  return points;
}', '9', '5', 'Without break, silver falls through into the bronze case and receives both bonuses.', 'static int bonus(String tier) {
  int points = 0;
  switch (tier) {
    case "gold": points += 50; break;
    case "silver": points += 20; break;
    case "bronze": points += 5; break;
  }
  return points;
}', array['java','switch']::text[]),
  ('java-same-total', '1', 'practice', 'java', 'hard', 'Same total', 'Return true when the prices add up to the expected total.', 'static boolean sameTotal(double[] prices, double expected) {
  double total = 0;
  for (double price : prices) total += price;
  return total == expected;
}', '5', '4', 'Floating-point sums such as 0.1 + 0.2 are not exactly 0.3. Compare with a small tolerance.', 'static boolean sameTotal(double[] prices, double expected) {
  double total = 0;
  for (double price : prices) total += price;
  return Math.abs(total - expected) < 1e-9;
}', array['java','floating-point']::text[]),
  ('java-initials', '1', 'practice', 'java', 'hard', 'Initials', 'Return the upper-case initials of the first and last name followed by a dot, such as AL.', 'static String initials(String first, String last) {
  char a = Character.toUpperCase(first.charAt(0));
  char b = Character.toUpperCase(last.charAt(0));
  return a + b + ".";
}', '5', '4', 'Adding two chars is numeric addition, so a + b produces a number. Start the expression with a string.', 'static String initials(String first, String last) {
  char a = Character.toUpperCase(first.charAt(0));
  char b = Character.toUpperCase(last.charAt(0));
  return "" + a + b + ".";
}', array['java','chars','strings']::text[]),
  ('java-major-version', '1', 'practice', 'java', 'hard', 'Major version', 'Return the major number of a version string such as 3.4.1.', 'static int majorVersion(String version) {
  String[] parts = version.split(".");
  if (parts.length == 0) return 0;
  return Integer.parseInt(parts[0]);
}', '5', '2', 'split takes a regular expression where . matches any character. Escape the dot to split on it literally.', 'static int majorVersion(String version) {
  String[] parts = version.split("\\.");
  if (parts.length == 0) return 0;
  return Integer.parseInt(parts[0]);
}', array['java','regex','parsing']::text[]),
  ('java-bucket-index', '1', 'practice', 'java', 'hard', 'Bucket index', 'Map a key to a bucket index from 0 up to buckets - 1; it must never be negative.', 'static int bucket(Object key, int buckets) {
  int hash = key.hashCode();
  int index = Math.abs(hash) % buckets;
  return index;
}', '5', '3', 'Math.abs(Integer.MIN_VALUE) is still negative. floorMod always returns a value in range.', 'static int bucket(Object key, int buckets) {
  int hash = key.hashCode();
  int index = Math.floorMod(hash, buckets);
  return index;
}', array['java','hashing','overflow']::text[]),
  ('java-drop-evens', '1', 'practice', 'java', 'hard', 'Drop the evens', 'Return a copy of the list without its even numbers.', 'static List<Integer> dropEvens(List<Integer> values) {
  List<Integer> result = new ArrayList<>(values);
  for (int i = 0; i < result.size(); i++) {
    if (result.get(i) % 2 == 0) result.remove(i);
  }
  return result;
}', '7', '3', 'Removing an element shifts the rest left, so a forward loop skips the next one. Walk backwards.', 'static List<Integer> dropEvens(List<Integer> values) {
  List<Integer> result = new ArrayList<>(values);
  for (int i = result.size() - 1; i >= 0; i--) {
    if (result.get(i) % 2 == 0) result.remove(i);
  }
  return result;
}', array['java','collections','iteration']::text[]),
  ('java-score-of', '1', 'practice', 'java', 'hard', 'Score of a player', 'Return the player score, or 0 when the player is missing or the score is not positive.', 'static int scoreOf(Map<String, Integer> scores, String player) {
  if (player == null) return 0;
  Integer score = scores.get(player);
  return score > 0 ? score : 0;
}', '5', '4', 'get returns null for a missing player, and unboxing it in the comparison throws. Check for null first.', 'static int scoreOf(Map<String, Integer> scores, String player) {
  if (player == null) return 0;
  Integer score = scores.get(player);
  return score != null && score > 0 ? score : 0;
}', array['java','maps','null']::text[]),
  ('java-longest-word', '1', 'practice', 'java', 'hard', 'Longest word', 'Return the longest word; when several share the length, return the first one.', 'static String longest(List<String> words) {
  String best = "";
  for (String word : words) {
    if (word.length() >= best.length()) best = word;
  }
  return best;
}', '7', '4', 'With >= a later word of equal length replaces the earlier one. Use a strict comparison to keep the first.', 'static String longest(List<String> words) {
  String best = "";
  for (String word : words) {
    if (word.length() > best.length()) best = word;
  }
  return best;
}', array['java','strings','ties']::text[])
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
