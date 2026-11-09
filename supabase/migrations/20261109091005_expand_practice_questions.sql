-- Add fifteen reviewed Practice questions; preserve all existing versions.
-- Reviewed repository content only. No users, matches or credentials.
-- Existing versions are immutable; edit content by adding a new version.
insert into private.questions (slug,version,pool,language,difficulty,title,prompt,code,
  line_count,correct_line,explanation,corrected_code,tags) values
  ('positive-sum', '1', 'practice', 'python', 'easy', 'Sum positives', 'Return the sum of strictly positive values.', 'def positive_sum(values):
    total = 0
    for value in values:
        if value < 0:
            total += value
    return total', '6', '4', 'Only positive values should contribute to the total.', 'def positive_sum(values):
    total = 0
    for value in values:
        if value > 0:
            total += value
    return total', array['practice']::text[]),
  ('count-vowels', '1', 'practice', 'python', 'easy', 'Count lowercase vowels', 'Count lowercase vowels in a string.', 'def count_vowels(text):
    count = 0
    for char in text:
        if char not in "aeiou":
            count += 1
    return count', '6', '4', 'Count the characters that are vowels.', 'def count_vowels(text):
    count = 0
    for char in text:
        if char in "aeiou":
            count += 1
    return count', array['practice']::text[]),
  ('last-item', '1', 'practice', 'python', 'easy', 'Last item', 'Return the last element of a nonempty list.', 'def last_item(items):
    last = items[0]
    for item in items:
        last = items[0]
    return last', '5', '4', 'Update the result with the current item.', 'def last_item(items):
    last = items[0]
    for item in items:
        last = item
    return last', array['practice']::text[]),
  ('count-long-words', '1', 'practice', 'python', 'easy', 'Count long words', 'Count words with at least four characters.', 'def count_long(words):
    count = 0
    for word in words:
        if len(word) > 4:
            count += 1
    return count', '6', '4', 'The threshold includes words with exactly four characters.', 'def count_long(words):
    count = 0
    for word in words:
        if len(word) >= 4:
            count += 1
    return count', array['practice']::text[]),
  ('reverse-list-copy', '1', 'practice', 'python', 'easy', 'Reverse a list', 'Return a new list in reverse order without changing the input.', 'def reversed_copy(items):
    result = []
    for item in items:
        result.append(item)
    return result', '5', '4', 'Insert each new item at the start to reverse the order.', 'def reversed_copy(items):
    result = []
    for item in items:
        result.insert(0, item)
    return result', array['practice']::text[]),
  ('first-negative', '1', 'practice', 'python', 'medium', 'First negative index', 'Return the index of the first negative number, or -1 if none exists.', 'def first_negative(values):
    found = -1
    for index, value in enumerate(values):
        if value < 0:
            found = index
    return found', '6', '5', 'Return immediately when the first negative number is found.', 'def first_negative(values):
    found = -1
    for index, value in enumerate(values):
        if value < 0:
            return index
    return found', array['practice']::text[]),
  ('running-max', '1', 'practice', 'python', 'medium', 'Running maximum', 'Return a list containing the greatest value seen so far at each position. Input is nonempty.', 'def running_max(values):
    best = values[0]
    result = []
    for value in values:
        best = value
        result.append(best)
    return result', '7', '5', 'Keep the greater of the current value and the previous maximum.', 'def running_max(values):
    best = values[0]
    result = []
    for value in values:
        best = max(best, value)
        result.append(best)
    return result', array['practice']::text[]),
  ('common-unique', '1', 'practice', 'python', 'medium', 'Unique common elements', 'Return the set of values present in both lists.', 'def common_unique(left, right):
    result = set()
    for value in left:
        if value not in right:
            result.add(value)
    return result', '6', '4', 'Add values that occur in both inputs.', 'def common_unique(left, right):
    result = set()
    for value in left:
        if value in right:
            result.add(value)
    return result', array['practice']::text[]),
  ('prefix-length', '1', 'practice', 'python', 'medium', 'Matching prefix length', 'Count matching elements from the start of both lists until the first mismatch.', 'def prefix_length(left, right):
    count = 0
    for a, b in zip(left, right):
        if a != b:
            continue
        count += 1
    return count', '7', '5', 'Stop counting as soon as the first pair differs.', 'def prefix_length(left, right):
    count = 0
    for a, b in zip(left, right):
        if a != b:
            break
        count += 1
    return count', array['practice']::text[]),
  ('frequency-count', '1', 'practice', 'python', 'medium', 'Count occurrences', 'Return a dictionary mapping each value to its count.', 'def frequencies(values):
    counts = {}
    for value in values:
        counts[value] = 1
    return counts', '5', '4', 'Increment the previous count for every occurrence.', 'def frequencies(values):
    counts = {}
    for value in values:
        counts[value] = counts.get(value, 0) + 1
    return counts', array['practice']::text[]),
  ('longest-run', '1', 'practice', 'python', 'hard', 'Longest equal run', 'Return the length of the longest consecutive run of equal values, or zero for an empty list.', 'def longest_run(values):
    best = 0
    run = 0
    previous = None
    for value in values:
        if value == previous:
            run += 1
        else:
            run = 0
        best = max(best, run)
        previous = value
    return best', '12', '9', 'A new run starts at length one.', 'def longest_run(values):
    best = 0
    run = 0
    previous = None
    for value in values:
        if value == previous:
            run += 1
        else:
            run = 1
        best = max(best, run)
        previous = value
    return best', array['practice']::text[]),
  ('balanced-parentheses', '1', 'practice', 'python', 'hard', 'Balanced parentheses', 'Return whether a string of parentheses is balanced, with no closing bracket before its opening bracket.', 'def balanced(text):
    depth = 0
    for char in text:
        if char == "(":
            depth += 1
        else:
            depth -= 1
        if depth < 0:
            return False
    return depth >= 0', '10', '10', 'A balanced sequence must finish at depth zero.', 'def balanced(text):
    depth = 0
    for char in text:
        if char == "(":
            depth += 1
        else:
            depth -= 1
        if depth < 0:
            return False
    return depth == 0', array['practice']::text[]),
  ('first-unique', '1', 'practice', 'python', 'hard', 'First unique character', 'Return the first character occurring exactly once, or None when there is none.', 'def first_unique(text):
    counts = {}
    for char in text:
        counts[char] = counts.get(char, 0) + 1
    for char in text:
        if counts[char] > 1:
            return char
    return None', '8', '6', 'A unique character has a frequency of exactly one.', 'def first_unique(text):
    counts = {}
    for char in text:
        counts[char] = counts.get(char, 0) + 1
    for char in text:
        if counts[char] == 1:
            return char
    return None', array['practice']::text[]),
  ('merge-sorted', '1', 'practice', 'python', 'hard', 'Merge sorted lists', 'Merge two ascending lists into one ascending list, preserving duplicates.', 'def merge_sorted(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] < right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    return result + left[i:]', '9', '9', 'Append the remaining elements from both lists.', 'def merge_sorted(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] < right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    return result + left[i:] + right[j:]', array['practice']::text[]),
  ('unique-in-order', '1', 'practice', 'python', 'hard', 'Keep first appearances', 'Return each distinct value once, preserving its first occurrence order.', 'def unique_order(values):
    seen = set()
    result = []
    for value in values:
        if value not in seen:
            seen.add(value)
        result.append(value)
    return result', '8', '7', 'Append only when the value has not been seen before.', 'def unique_order(values):
    seen = set()
    result = []
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result', array['practice']::text[])
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
