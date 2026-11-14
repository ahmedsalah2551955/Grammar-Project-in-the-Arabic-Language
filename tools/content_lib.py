#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""نَحْو — مكتبة المحتوى المشتركة.

تُعرّف مخطط بيانات الدروس والقطع، وتوفر دوال التحقق والتطبيع والبحث التي
تستخدمها أدوات المشروع (validate_content.py وbuild_data.py وadd_passages.py).
تعتمد مكتبة Python القياسية فقط، ولا تتصل بشبكة.
"""

import json
import re
from pathlib import Path

# ---------------------------------------------------------------------------
# المسارات
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content"
LESSONS_PATH = CONTENT_DIR / "lessons.json"
PASSAGES_DIR = CONTENT_DIR / "passages"
DATA_DIR = ROOT / "data"
BUILD_INFO_PATH = DATA_DIR / "build-info.json"

# ---------------------------------------------------------------------------
# مخطط البيانات: الثوابت
# ---------------------------------------------------------------------------

SCHEMA_VERSION = 1
TOTAL_LESSONS = 53
LEVELS = (1, 2, 3, 4, 5)

# عدد القطع المطلوب لكل مستوى في كل درس جاهز (الحزمة السادسة).
PASSAGES_PER_LEVEL = 10

# الدروس التي يُبنى لها بنك قطع في أول تسليم.
BANK_LESSONS = (1, 2, 3, 4, 5)

QUESTION_TYPES = ("mcq", "tap", "fill", "transform")

# الأقسام التسعة كما في الخطة؛ مفاتيحها تطابق ثوابت js/utils.js.
SECTIONS = (
    {"key": "basics", "title": "الأساسيات", "from": 1, "to": 10},
    {"key": "marfoo", "title": "المرفوعات", "from": 11, "to": 14},
    {"key": "nawasikh", "title": "النواسخ", "from": 15, "to": 19},
    {"key": "mansoob", "title": "المنصوبات", "from": 20, "to": 28},
    {"key": "majroor", "title": "المجرورات", "from": 29, "to": 30},
    {"key": "far3i", "title": "العلامات الفرعية", "from": 31, "to": 36},
    {"key": "tawabi", "title": "التوابع", "from": 37, "to": 40},
    {"key": "af3al", "title": "إعراب الفعل والأساليب", "from": 41, "to": 48},
    {"key": "mushtaqqat", "title": "المشتقات", "from": 49, "to": 53},
)

SECTION_KEYS = tuple(section["key"] for section in SECTIONS)

# قواعد كل مستوى من مستويات التدريب (جدول «محتوى القطع» في الخطة):
#   questions : نطاق عدد الأسئلة في القطعة (error إن خرج عنه)
#   words     : نطاق عدد الكلمات في النص (warning إن خرج عنه)
#   sentences : نطاق عدد الجمل في النص (warning إن خرج عنه)
LEVEL_RULES = {
    1: {"label": "سهل", "questions": (1, 1), "words": (3, 6), "sentences": None},
    2: {"label": "سهل متوسط", "questions": (2, 2), "words": (6, 10), "sentences": None},
    3: {"label": "متوسط", "questions": (3, 3), "words": None, "sentences": (2, 2)},
    4: {"label": "صعب متوسط", "questions": (3, 4), "words": None, "sentences": (2, 3)},
    5: {"label": "صعب", "questions": (4, 5), "words": None, "sentences": (3, 4)},
}

# النسبة الدنيا للحروف المعرّبة في النص لاعتباره مشكولًا بالكامل.
DIACRITIC_MIN_RATIO = 0.85

# حقول محتوى الدرس الجاهز.
LESSON_CONTENT_KEYS = ("explanation", "ruleTable", "examples", "tip")

# ---------------------------------------------------------------------------
# أدوات نصية عربية
# ---------------------------------------------------------------------------

_HARAKAT = frozenset("\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652\u0670")
_TATWEEL = "\u0640"
_ARABIC_LETTER = re.compile(r"[\u0621-\u064A]")
# حروف المد الطويلة لا تحمل حركة، فتُستثنى من حساب التشكيل.
_LONG_VOWELS = frozenset("\u0622\u0627\u0648\u064A\u0649\u0671")
# حروف الهمزة تحمل الحركة على ما بعدها في الغالب (مثل «الأَبُ» و«إِلَى»)،
# فتُستثنى كذلك حتى لا يُظلم النص المشكول قصدًا.
_HAMZA_CARRIERS = frozenset("\u0621\u0623\u0624\u0625\u0626")
_ALEF = "\u0627"
_LAM = "\u0644"
_PUNCT_CHARS = (
    "\u060C\u061B\u061F\u066A\u066B\u066C\u066D\u06D4"
    "\u00AB\u00BB\u2026\u2013\u2014"
    ".،؛؟!:;?!\u201C\u201D\u2018\u2019()[]{}\"'*/\\|+=<>-_,"
)
_PUNCTUATION = re.compile("[" + re.escape(_PUNCT_CHARS) + "]+")
_SENTENCE_SPLIT = re.compile(r"[.؟!؛;\u06D4]+")


def ar(number):
    """تحويل رقم إلى الصيغة العربية الهندية لعرضه في التقارير."""
    return str(number).translate(str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩"))


def strip_tashkeel(text):
    """حذف الحركات والمدّة من النص مع إبقاء الحروف."""
    return "".join(
        char for char in (text or "") if char not in _HARAKAT and char != _TATWEEL
    )


def normalize_text(text):
    """تطبيع النص للمقارنة: بلا تشكيل ولا ترقيم، وتوحيد الألف والياء والتاء."""
    cleaned = []
    for char in strip_tashkeel(text or ""):
        if char in "\u0623\u0625\u0622\u0671":
            char = "\u0627"
        elif char == "\u0649":
            char = "\u064A"
        elif char == "\u0629":
            char = "\u0647"
        cleaned.append(char)
    return " ".join(_PUNCTUATION.sub(" ", "".join(cleaned)).split())


def diacritic_coverage(text):
    """نسبة الحروف المعرّبة التي تحمل حركة (بين ٠ و١).

    تُستثنى من الحساب: حروف المد (ا و ي ى) والألف الممدودة لأنها لا تحمل
    حركة أصلًا، وحروف الهمزة (ء أ إ ؤ ئ) لأن الحركة تقع على ما بعدها في
    الغالب، ولام التعريف في «ال» لأنها ساكنة في حروف الشمس ومعلومة في غيرها.
    وتُحسب الشدّة حركةً كافية على الحرف.
    """
    text = text or ""
    eligible = 0
    covered = 0
    length = len(text)
    for index, char in enumerate(text):
        if char in _HARAKAT or char == _TATWEEL:
            continue
        if not _ARABIC_LETTER.fullmatch(char):
            continue
        if char in _LONG_VOWELS or char in _HAMZA_CARRIERS:
            continue
        if char == _LAM and index > 0 and text[index - 1] == _ALEF:
            continue
        eligible += 1
        probe = index + 1
        while probe < length and (text[probe] in _HARAKAT or text[probe] == _TATWEEL):
            probe += 1
        if probe > index + 1:
            covered += 1
    return 1.0 if eligible == 0 else covered / eligible


def is_fully_diacritized(text, ratio=DIACRITIC_MIN_RATIO):
    return diacritic_coverage(text) >= ratio


def word_count(text):
    """عدد الكلمات بعد تجريد التشكيل والترقيم."""
    return len(normalize_text(text).split())


def sentence_count(text):
    """عدد الجمل بعد اقتطاعها عند علامات النهاية."""
    return len([part for part in _SENTENCE_SPLIT.split(text or "") if part.strip()])


# ---------------------------------------------------------------------------
# مجمع الملاحظات (أخطاء/تحذيرات)
# ---------------------------------------------------------------------------


class Issues:
    """يجمع أخطاء وتحذيرات الفحص للعرض في تقرير واحد."""

    def __init__(self):
        self.errors = []
        self.warnings = []

    def error(self, where, code, message):
        self.errors.append({"where": where, "code": code, "message": message})

    def warning(self, where, code, message):
        self.warnings.append({"where": where, "code": code, "message": message})

    @property
    def has_errors(self):
        return bool(self.errors)

    def extend(self, other):
        self.errors.extend(other.errors)
        self.warnings.extend(other.warnings)


def rel_path(path):
    """مسار مختصر نسبةً إلى جذر المشروع لعرضه في التقارير."""
    try:
        return str(Path(path).resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def load_json(path, issues):
    """قراءة ملف JSON (يتسامح مع BOM) مع تسجيل الخطأ في المجمّع."""
    try:
        with open(path, "r", encoding="utf-8-sig") as handle:
            return json.load(handle)
    except FileNotFoundError:
        issues.error(rel_path(path), "file-missing", "الملف غير موجود.")
    except (json.JSONDecodeError, UnicodeDecodeError, OSError) as exc:
        issues.error(rel_path(path), "json-invalid", "تعذّرت قراءة الملف: %s" % exc)
    return None


# ---------------------------------------------------------------------------
# التحقق من lessons.json
# ---------------------------------------------------------------------------


def section_for_lesson(lesson_id):
    """القسم الذي يقع فيه رقم الدرس وفق الخطة، أو None."""
    for section in SECTIONS:
        if section["from"] <= lesson_id <= section["to"]:
            return section
    return None


def validate_lessons_file(issues):
    """يحقق بنية lessons.json ويعيد قائمة الدروس أو None عند فشل قاتل."""
    data = load_json(LESSONS_PATH, issues)
    if not isinstance(data, dict):
        issues.error(rel_path(LESSONS_PATH), "schema", "الجذر يجب أن يكون كائنًا فيه version وlessons.")
        return None

    if data.get("version") != SCHEMA_VERSION:
        issues.error(rel_path(LESSONS_PATH), "version", "حقل version يجب أن يكون %d." % SCHEMA_VERSION)

    for key in data:
        if key not in ("version", "lessons"):
            issues.warning(rel_path(LESSONS_PATH), "unknown-key", "مفتاح غير معروف في الجذر: «%s»." % key)

    lessons = data.get("lessons")
    if not isinstance(lessons, list) or not lessons:
        issues.error(rel_path(LESSONS_PATH), "lessons-missing", "قائمة lessons مفقودة أو فارغة.")
        return None

    if len(lessons) != TOTAL_LESSONS:
        issues.error(
            rel_path(LESSONS_PATH),
            "lesson-count",
            "عدد الدروس %s وليس %s." % (ar(len(lessons)), ar(TOTAL_LESSONS)),
        )

    seen_ids = set()
    seen_titles = {}
    result = []
    for index, lesson in enumerate(lessons):
        where = "%s › lessons[%s]" % (rel_path(LESSONS_PATH), ar(index))
        if not isinstance(lesson, dict):
            issues.error(where, "schema", "الدرس يجب أن يكون كائنًا.")
            continue

        lesson_id = lesson.get("id")
        if type(lesson_id) is not int:
            issues.error(where, "id-invalid", "حقل id يجب أن يكون رقمًا صحيحًا.")
            continue
        if lesson_id in seen_ids:
            issues.error(where, "id-duplicate", "رقم الدرس %s مكرر." % ar(lesson_id))
            continue
        seen_ids.add(lesson_id)
        if lesson_id != index + 1:
            issues.error(
                where,
                "id-order",
                "الترتيب غير صحيح: توقعت الدرس %s في الموضع %s." % (ar(index + 1), ar(index + 1)),
            )
        where = "%s › الدرس %s" % (rel_path(LESSONS_PATH), ar(lesson_id))

        if type(lesson_id) is not int or not 1 <= lesson_id <= TOTAL_LESSONS:
            issues.error(where, "id-range", "رقم الدرس خارج نطاق ١–٥٣.")

        title = lesson.get("title")
        if not isinstance(title, str) or len(title.strip()) < 2:
            issues.error(where, "title-invalid", "العنوان نص مطلوب لا يقل عن حرفين.")
        elif len(title.strip()) > 80:
            issues.warning(where, "title-long", "العنوان طويل (%s حرفًا)." % ar(len(title.strip())))
        elif title.strip() in seen_titles:
            issues.warning(
                where,
                "title-duplicate",
                "العنوان مكرر مع الدرس %s." % ar(seen_titles[title.strip()]),
            )
        else:
            seen_titles[title.strip()] = lesson_id

        section_key = lesson.get("section")
        expected = section_for_lesson(lesson_id) if type(lesson_id) is int else None
        if section_key not in SECTION_KEYS:
            issues.error(where, "section-invalid", "مفتاح القسم «%s» غير معروف." % section_key)
        elif expected is not None and section_key != expected["key"]:
            issues.error(
                where,
                "section-range",
                "الدرس %s يجب أن يكون في قسم «%s» وليس «%s»."
                % (ar(lesson_id), expected["title"], section_key),
            )

        ready = lesson.get("ready")
        if type(ready) is not bool:
            issues.error(where, "ready-invalid", "حقل ready يجب أن يكون منطقيًا true/false.")

        for key in lesson:
            if key not in ("id", "title", "section", "ready", *LESSON_CONTENT_KEYS):
                issues.warning(where, "unknown-key", "مفتاح غير معروف: «%s»." % key)

        result.append(lesson)

    for section in SECTIONS:
        count = sum(
            1
            for lesson in result
            if lesson.get("section") == section["key"] and type(lesson.get("id")) is int
            and section["from"] <= lesson["id"] <= section["to"]
        )
        if count != section["to"] - section["from"] + 1:
            issues.error(
                rel_path(LESSONS_PATH),
                "section-coverage",
                "القسم «%s» يضم %s درسًا بدل %s."
                % (section["title"], ar(count), ar(section["to"] - section["from"] + 1)),
            )

    return result


def validate_ready_lesson(lesson, issues):
    """يحقق المحتوى الكامل للدرس الجاهز: شرح وجدول وخمسة أمثلة وتذكّر."""
    lesson_id = lesson.get("id")
    where = "%s › الدرس %s" % (rel_path(LESSONS_PATH), ar(lesson_id))

    for key in LESSON_CONTENT_KEYS:
        if key not in lesson:
            issues.error(where, "lesson-content-missing", "الدرس جاهز لكن حقل «%s» مفقود." % key)

    explanation = lesson.get("explanation")
    if explanation is not None:
        if not isinstance(explanation, list) or not (3 <= len(explanation) <= 6):
            issues.error(where, "explanation-count", "الشرح يجب أن يكون ٣–٦ أسطر قصيرة.")
        else:
            for line_index, line in enumerate(explanation):
                if not isinstance(line, str) or not line.strip():
                    issues.error(where, "explanation-empty", "سطر الشرح رقم %s فارغ." % ar(line_index + 1))
                elif len(line.strip()) > 220:
                    issues.warning(where, "explanation-long", "سطر الشرح رقم %s طويل جدًا." % ar(line_index + 1))

    rule_table = lesson.get("ruleTable")
    if rule_table is not None:
        if not isinstance(rule_table, dict):
            issues.error(where, "ruletable-invalid", "جدول القاعدة يجب أن يكون كائنًا فيه title وheaders وrows.")
        else:
            title = rule_table.get("title")
            if not isinstance(title, str) or not title.strip():
                issues.error(where, "ruletable-title", "عنوان جدول القاعدة مفقود.")
            headers = rule_table.get("headers")
            if not isinstance(headers, list) or not (2 <= len(headers) <= 4) or any(
                not isinstance(header, str) or not header.strip() for header in headers
            ):
                issues.error(where, "ruletable-headers", "رؤوس الجدول يجب أن تكون ٢–٤ نصوص غير فارغة.")
                headers = None
            rows = rule_table.get("rows")
            if not isinstance(rows, list) or len(rows) < 2:
                issues.error(where, "ruletable-rows", "الجدول يحتاج صفين على الأقل.")
            elif headers is not None:
                for row_index, row in enumerate(rows):
                    if not isinstance(row, list) or len(row) != len(headers) or any(
                        not isinstance(cell, str) or not cell.strip() for cell in row
                    ):
                        issues.error(
                            where,
                            "ruletable-row",
                            "صف الجدول رقم %s لا يطابق عدد الرؤوس أو فيه خلية فارغة." % ar(row_index + 1),
                        )

    examples = lesson.get("examples")
    if examples is not None:
        if not isinstance(examples, list) or len(examples) != 5:
            issues.error(where, "examples-count", "الأمثلة المعربة يجب أن تكون ٥ بالضبط.")
        else:
            for example_index, example in enumerate(examples):
                example_where = "%s › المثال %s" % (where, ar(example_index + 1))
                if not isinstance(example, dict):
                    issues.error(example_where, "schema", "المثال يجب أن يكون كائنًا.")
                    continue
                sentence = example.get("sentence")
                if not isinstance(sentence, str) or not sentence.strip():
                    issues.error(example_where, "sentence-empty", "جملة المثال مفقودة.")
                elif not is_fully_diacritized(sentence):
                    issues.error(
                        example_where,
                        "tashkeel",
                        "جملة المثال غير مشكولة بالكامل (نسبة التشكيل %s٪)."
                        % ar(round(diacritic_coverage(sentence) * 100)),
                    )
                parsing = example.get("parsing")
                if not isinstance(parsing, list) or len(parsing) < 1:
                    issues.error(example_where, "parsing-empty", "المثال يحتاج إعرابًا لكلمة واحدة على الأقل.")
                else:
                    for item_index, item in enumerate(parsing):
                        item_where = "%s › الإعراب %s" % (example_where, ar(item_index + 1))
                        if not isinstance(item, dict):
                            issues.error(item_where, "schema", "مدخل الإعراب يجب أن يكون كائنًا.")
                            continue
                        for field in ("word", "role", "sign"):
                            value = item.get(field)
                            if not isinstance(value, str) or not value.strip():
                                issues.error(item_where, "parsing-field", "حقل «%s» مفقود أو فارغ." % field)
                        for key in item:
                            if key not in ("word", "role", "sign"):
                                issues.warning(item_where, "unknown-key", "مفتاح غير معروف: «%s»." % key)
                for key in example:
                    if key not in ("sentence", "parsing"):
                        issues.warning(example_where, "unknown-key", "مفتاح غير معروف: «%s»." % key)

    tip = lesson.get("tip")
    if tip is not None:
        if not isinstance(tip, list) or not (1 <= len(tip) <= 6):
            issues.error(where, "tip-count", "صندوق «تذكّر» يجب أن يحتوي ١–٦ ملاحظات.")
        else:
            for tip_index, note in enumerate(tip):
                if not isinstance(note, str) or not note.strip():
                    issues.error(where, "tip-empty", "ملاحظة «تذكّر» رقم %s فارغة." % ar(tip_index + 1))


# ---------------------------------------------------------------------------
# التحقق من بنوك القطع
# ---------------------------------------------------------------------------

_BANK_DIR = re.compile(r"^L(\d{2})$")
_LEVEL_FILE = re.compile(r"^level([1-5])\.json$")
_PASSAGE_ID = re.compile(r"^L(\d{2})-L([1-5])-(\d{4})$")


def _validate_question(question, passage_text, level, where, issues):
    """يحقق سؤالًا واحدًا داخل قطعة."""
    if not isinstance(question, dict):
        issues.error(where, "schema", "السؤال يجب أن يكون كائنًا.")
        return

    question_type = question.get("type")
    if question_type not in QUESTION_TYPES:
        issues.error(
            where,
            "question-type",
            "نوع السؤال «%s» غير معروف؛ المسموح: %s." % (question_type, "، ".join(QUESTION_TYPES)),
        )

    prompt = question.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip():
        issues.error(where, "prompt-empty", "نص السؤال مفقود أو فارغ.")
    elif not is_fully_diacritized(prompt):
        issues.warning(where, "prompt-tashkeel", "نص السؤال يُفضَّل أن يكون مشكولًا بالكامل.")

    explanation = question.get("explain")
    if not isinstance(explanation, str) or not explanation.strip():
        issues.error(where, "explain-empty", "تفسير الإجابة مطلوب لكل سؤال.")
    elif len(explanation.strip()) > 240:
        issues.warning(where, "explain-long", "التفسير أطول من اللازم (%s حرفًا)." % ar(len(explanation.strip())))

    if question_type == "tap":
        answer = question.get("answer")
        if not isinstance(answer, str) or not answer.strip():
            issues.error(where, "tap-answer", "إجابة سؤال الضغط يجب أن تكون كلمة موجودة في النص.")
        else:
            words = normalize_text(passage_text or "").split()
            target = normalize_text(answer)
            occurrences = words.count(target)
            if not target:
                issues.error(where, "tap-answer", "إجابة سؤال الضغط فارغة بعد تجريد التشكيل.")
            elif occurrences != 1:
                issues.error(
                    where,
                    "tap-word",
                    "كلمة سؤال الضغط تظهر %s مرة في النص، والمطلوب مرة واحدة بالضبط." % ar(occurrences),
                )
            if " " in answer.strip():
                issues.warning(where, "tap-phrase", "إجابة سؤال الضغط أفضل أن تكون كلمة واحدة.")
    else:
        answer = question.get("answer")
        if type(answer) is not int:
            issues.error(where, "answer-type", "حقل answer يجب أن يكون رقم فهرس يبدأ من صفر.")
            answer = None

        options = question.get("options")
        if not isinstance(options, list) or not (2 <= len(options) <= 6):
            issues.error(where, "options-count", "الخيارات يجب أن تكون ٢–٦ نصوص.")
            options = None
        else:
            for option_index, option in enumerate(options):
                if not isinstance(option, str) or not option.strip():
                    issues.error(where, "option-empty", "الخيار رقم %s فارغ." % ar(option_index + 1))
            unique = set(options)
            if len(unique) != len(options):
                issues.error(where, "option-duplicate", "يوجد خيار مكرر حرفيًا.")
            # في أسئلة الفراغ والتحويل يكون الاختلاف بين الخيارات في آخر الكلمة
            # (الضمة والكسرة والفتحة) هو المقصود، فلا يُنبَّه على تشابه الحروف.
            if question_type not in ("fill", "transform"):
                normalized = [normalize_text(option) for option in options]
                if len(set(normalized)) != len(normalized):
                    issues.warning(where, "option-similar", "يوجد خياران متشابهان بعد تجريد التشكيل.")

        if options is not None and answer is not None:
            if not 0 <= answer < len(options):
                issues.error(where, "answer-range", "فهرس الإجابة %s خارج نطاق الخيارات." % ar(answer))

        if question_type == "mcq" and options is not None and len(options) < 3:
            issues.warning(where, "mcq-thin", "سؤال الاختيار من متعدد أفضل بثلاثة خيارات فأكثر.")

    for key in question:
        if key not in ("id", "type", "prompt", "options", "answer", "explain"):
            issues.warning(where, "unknown-key", "مفتاح غير معروف: «%s»." % key)


def _is_draft_file(path):
    """هل الملف بنك مسوّدة؟ يُقرأ حقل draft من جذر الملف دون التحقق الكامل."""
    try:
        with open(path, "r", encoding="utf-8-sig") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return False
    return isinstance(data, dict) and data.get("draft") is True


def _validate_level_file(lesson, level, path, context, issues, draft=False):
    """يتحقق ملف مستوى واحد من بنك درس.

    يسمح لبنك مسوّدة (draft) أن ينقصه عدد القطع، فيتحوّل نقصُ العدد إلى
    تحذير بدل خطأ، وتبقى بقية القواعد (التشكيل، الإجابات، المعرفات) أخطاء.
    """
    data = load_json(path, issues)
    if not isinstance(data, dict):
        issues.error(rel_path(path), "schema", "الجذر يجب أن يكون كائنًا فيه lesson وlevel وpassages.")
        return

    if data.get("lesson") != lesson:
        issues.error(
            rel_path(path),
            "lesson-mismatch",
            "حقل lesson في الملف (%s) لا يطابق اسم المجلد (%s)." % (data.get("lesson"), ar(lesson)),
        )
    if data.get("level") != level:
        issues.error(
            rel_path(path),
            "level-mismatch",
            "حقل level في الملف (%s) لا يطابق اسم الملف (%s)." % (data.get("level"), ar(level)),
        )

    draft_flag = data.get("draft", False)
    if not isinstance(draft_flag, bool):
        issues.error(rel_path(path), "draft-invalid", "حقل draft يجب أن يكون منطقيًا true/false.")
        draft_flag = False
    if draft_flag:
        draft = True

    for key in data:
        if key not in ("lesson", "level", "passages", "draft"):
            issues.warning(rel_path(path), "unknown-key", "مفتاح غير معروف في الجذر: «%s»." % key)

    passages = data.get("passages")
    if not isinstance(passages, list) or not passages:
        issues.error(rel_path(path), "passages-empty", "قائمة القطع مفقودة أو فارغة.")
        return

    if len(passages) != PASSAGES_PER_LEVEL:
        if draft:
            issues.warning(
                rel_path(path),
                "passage-count-draft",
                "عدد القطع في المستوى %s هو %s؛ بنك مسوّدة يكتفي بما فيه، والبنك الكامل %s."
                % (ar(level), ar(len(passages)), ar(PASSAGES_PER_LEVEL)),
            )
        else:
            issues.error(
                rel_path(path),
                "passage-count",
                "عدد القطع في المستوى %s هو %s والمطلوب %s."
                % (ar(level), ar(len(passages)), ar(PASSAGES_PER_LEVEL)),
            )

    rules = LEVEL_RULES[level]
    seen_sequences = set()
    for index, passage in enumerate(passages):
        where = "%s › القطعة %s" % (rel_path(path), ar(index + 1))
        if not isinstance(passage, dict):
            issues.error(where, "schema", "القطعة يجب أن تكون كائنًا.")
            continue

        passage_id = passage.get("id")
        if not isinstance(passage_id, str):
            issues.error(where, "id-invalid", "معرف القطعة نص مطلوب.")
        else:
            match = _PASSAGE_ID.match(passage_id)
            if not match:
                issues.error(
                    where,
                    "id-format",
                    "المعرف «%s» لا يتبع الصيغة L{درس:02d}-L{مستوى}-{تسلسل:04d}." % passage_id,
                )
            else:
                id_lesson, id_level, id_seq = int(match.group(1)), int(match.group(2)), int(match.group(3))
                if id_lesson != lesson or id_level != level:
                    issues.error(where, "id-mismatch", "المعرف «%s» لا يطابق الدرس والمستوى." % passage_id)
                if id_seq in seen_sequences:
                    issues.error(where, "id-sequence", "التسلسل %s مكرر في هذا المستوى." % ar(id_seq))
                seen_sequences.add(id_seq)
                if passage_id in context["ids"]:
                    issues.error(
                        where,
                        "id-duplicate",
                        "المعرف «%s» مكرر مع %s." % (passage_id, context["ids"][passage_id]),
                    )
                else:
                    context["ids"][passage_id] = rel_path(path)

        if passage.get("lesson") != lesson:
            issues.error(where, "lesson-field", "حقل lesson داخل القطعة لا يطابق الدرس %s." % ar(lesson))
        if passage.get("level") != level:
            issues.error(where, "level-field", "حقل level داخل القطعة لا يطابق المستوى %s." % ar(level))

        text = passage.get("text")
        if not isinstance(text, str) or not text.strip():
            issues.error(where, "text-empty", "نص القطعة مفقود أو فارغ.")
            text = ""
        else:
            if not is_fully_diacritized(text):
                issues.error(
                    where,
                    "tashkeel",
                    "نص القطعة غير مشكول بالكامل (نسبة التشكيل %s٪)."
                    % ar(round(diacritic_coverage(text) * 100)),
                )
            words = word_count(text)
            sentences = sentence_count(text)
            if rules["words"] is not None and not (rules["words"][0] <= words <= rules["words"][1]):
                issues.warning(
                    where,
                    "length-words",
                    "عدد كلمات القطعة %s خارج نطاق المستوى %s (%s–%s كلمة)."
                    % (ar(words), ar(level), ar(rules["words"][0]), ar(rules["words"][1])),
                )
            if rules["sentences"] is not None and not (
                rules["sentences"][0] <= sentences <= rules["sentences"][1]
            ):
                issues.warning(
                    where,
                    "length-sentences",
                    "عدد جمل القطعة %s خارج نطاق المستوى %s (%s–%s جملة)."
                    % (ar(sentences), ar(level), ar(rules["sentences"][0]), ar(rules["sentences"][1])),
                )

            normalized_text = normalize_text(text)
            if normalized_text in context["texts"]:
                issues.error(
                    where,
                    "text-duplicate",
                    "نص القطعة مكرر مع القطعة في %s." % context["texts"][normalized_text],
                )
            else:
                context["texts"][normalized_text] = rel_path(path)

        source = passage.get("source")
        if not isinstance(source, str) or not source.strip():
            issues.error(where, "source-empty", "حقل المصدر مطلوب (مثل: من الحياة اليومية).")

        questions = passage.get("questions")
        if not isinstance(questions, list) or not questions:
            issues.error(where, "questions-empty", "القطعة تحتاج سؤالًا واحدًا على الأقل.")
            questions = []
        else:
            q_min, q_max = rules["questions"]
            if not (q_min <= len(questions) <= q_max):
                issues.error(
                    where,
                    "question-count",
                    "عدد أسئلة القطعة %s خارج نطاق المستوى %s (%s–%s)."
                    % (ar(len(questions)), ar(level), ar(q_min), ar(q_max)),
                )
            for question_index, question in enumerate(questions):
                question_where = "%s › السؤال %s" % (where, ar(question_index + 1))
                if isinstance(question, dict):
                    expected_id = "q%d" % (question_index + 1)
                    if question.get("id") != expected_id:
                        issues.error(
                            question_where,
                            "question-id",
                            "معرف السؤال يجب أن يكون «%s» بالترتيب." % expected_id,
                        )
                _validate_question(question, text, level, question_where, issues)

        for key in passage:
            if key not in ("id", "lesson", "level", "text", "source", "questions"):
                issues.warning(where, "unknown-key", "مفتاح غير معروف: «%s»." % key)


def validate_banks(issues, lessons_by_id):
    """يفحص بنوك القطع ويعيد (بنوك لكل درس، إحصاءات مختصرة)."""
    banks = {}
    context = {"ids": {}, "texts": {}}

    directories = []
    if PASSAGES_DIR.is_dir():
        for entry in sorted(PASSAGES_DIR.iterdir()):
            if not entry.is_dir():
                continue
            if entry.name.startswith("_"):
                continue
            match = _BANK_DIR.match(entry.name)
            if not match:
                issues.warning(rel_path(entry), "unknown-dir", "مجلد غير معروف في passages (الصيغة: L01).")
                continue
            directories.append((int(match.group(1)), entry))
    else:
        issues.warning(
            rel_path(PASSAGES_DIR),
            "banks-pending",
            "مجلد القطع غير موجود بعد؛ بنوك الدروس ١–٥ تُسلّم في الحزمة السادسة درسًا درسًا.",
        )

    for lesson_id, directory in directories:
        where = rel_path(directory)
        if lesson_id not in lessons_by_id:
            issues.error(where, "bank-unknown-lesson", "بنك لدرس غير موجود في lessons.json.")
            continue
        if not lessons_by_id[lesson_id].get("ready"):
            issues.error(
                where,
                "bank-not-ready",
                "بنك قطع لدرس غير جاهز (ready=false)؛ فعّل الدرس أولًا في lessons.json.",
            )

        level_files = {}
        for entry in sorted(directory.iterdir()):
            if not entry.is_file():
                issues.warning(rel_path(entry), "unknown-file", "عنصر غير ملف داخل مجلد بنك.")
                continue
            match = _LEVEL_FILE.match(entry.name)
            if not match:
                issues.warning(rel_path(entry), "unknown-file", "ملف غير معروف داخل مجلد بنك (الصيغة: level3.json).")
                continue
            level_files[int(match.group(1))] = entry

        if not level_files:
            issues.error(where, "bank-empty", "مجلد البنك لا يحتوي ملفات مستويات (level1.json … level5.json).")

        draft_bank = any(_is_draft_file(level_files[level]) for level in level_files)

        for level in LEVELS:
            if level not in level_files:
                if draft_bank:
                    issues.warning(
                        where,
                        "level-missing-draft",
                        "ملف المستوى %s مفقود في بنك مسوّدة." % ar(level),
                    )
                else:
                    issues.error(
                        where,
                        "level-missing",
                        "ملف المستوى %s مفقود (level%d.json)." % (ar(level), level),
                    )

        lesson_banks = {"passages": 0, "questions": 0, "levels": {}}
        for level in LEVELS:
            path = level_files.get(level)
            if path is None:
                continue
            _validate_level_file(lesson_id, level, path, context, issues, draft=draft_bank)
            # نقرأ الملف مجددًا لخفةٍ لحساب الإحصاءات بعد التحقق.
            try:
                with open(path, "r", encoding="utf-8-sig") as handle:
                    data = json.load(handle)
            except (json.JSONDecodeError, OSError):
                data = None
            passages = data.get("passages") if isinstance(data, dict) else None
            if isinstance(passages, list):
                lesson_banks["levels"][level] = len(passages)
                lesson_banks["passages"] += len(passages)
                lesson_banks["questions"] += sum(
                    len(passage.get("questions") or [])
                    for passage in passages
                    if isinstance(passage, dict)
                )

        banks[lesson_id] = lesson_banks

    # تحذير مجمّع واحد عن بنوك لم تُسلّم بعد (متوقعة قبل اكتمال الحزمة السادسة).
    present = {lesson_id for lesson_id, _ in directories}
    missing = [lesson for lesson in BANK_LESSONS if lesson not in present]
    if missing:
        issues.warning(
            rel_path(PASSAGES_DIR),
            "banks-pending",
            "بنوك القطع غير مُسلّمة بعد للدروس: %s — تُسلّم في الحزمة السادسة درسًا درسًا."
            % "، ".join(ar(lesson) for lesson in missing),
        )

    return banks


# ---------------------------------------------------------------------------
# الإحصاءات والتقرير
# ---------------------------------------------------------------------------


def collect_stats(lessons, banks):
    lessons = lessons or []
    by_lesson = {}
    for lesson_id, bank in banks.items():
        by_lesson[lesson_id] = {
            "passages": bank.get("passages", 0),
            "questions": bank.get("questions", 0),
        }

    sections_stats = {}
    for section in SECTIONS:
        in_range = [
            lesson for lesson in lessons
            if type(lesson.get("id")) is int and section["from"] <= lesson["id"] <= section["to"]
        ]
        sections_stats[section["key"]] = {
            "title": section["title"],
            "range": (section["from"], section["to"]),
            "lessons": len(in_range),
            "ready": sum(1 for lesson in in_range if lesson.get("ready")),
            "passages": sum(by_lesson.get(lesson.get("id"), {}).get("passages", 0) for lesson in in_range),
            "questions": sum(by_lesson.get(lesson.get("id"), {}).get("questions", 0) for lesson in in_range),
        }

    totals = {
        "lessons": len(lessons),
        "ready": sum(1 for lesson in lessons if lesson.get("ready")),
        "passages": sum(bank.get("passages", 0) for bank in banks.values()),
        "questions": sum(bank.get("questions", 0) for bank in banks.values()),
        "banks": len(banks),
    }
    return {"sections": sections_stats, "totals": totals, "byLesson": by_lesson, "banks": banks}


def build_report(issues, stats):
    lines = []
    lines.append("=== فحص محتوى منصة نَحْو ===")

    totals = stats["totals"]
    lines.append(
        "lessons.json: %s درسًا · جاهز %s · بنوك قطع %s · قطع %s · أسئلة %s"
        % (ar(totals["lessons"]), ar(totals["ready"]), ar(totals["banks"]), ar(totals["passages"]), ar(totals["questions"]))
    )

    if issues.errors:
        lines.append("")
        lines.append("الأخطاء (%s) — تمنع البناء:" % ar(len(issues.errors)))
        for item in issues.errors:
            lines.append("  [خطأ] %s — %s (%s)" % (item["where"], item["message"], item["code"]))
    else:
        lines.append("الأخطاء: لا شيء.")

    if issues.warnings:
        lines.append("")
        lines.append("التحذيرات (%s):" % ar(len(issues.warnings)))
        for item in issues.warnings:
            lines.append("  [تحذير] %s — %s (%s)" % (item["where"], item["message"], item["code"]))

    lines.append("")
    lines.append("=== إحصاءات الأقسام ===")
    header = "القسم                      الدروس  جاهزة  قطع  أسئلة"
    lines.append(header)
    for section in SECTIONS:
        row = stats["sections"][section["key"]]
        lines.append(
            "%-24s  %s  %s  %s  %s"
            % (
                "%s (%s–%s)" % (row["title"], ar(row["range"][0]), ar(row["range"][1])),
                ar(row["lessons"]).ljust(2),
                ar(row["ready"]).ljust(2),
                ar(row["passages"]).ljust(2),
                ar(row["questions"]),
            )
        )
    lines.append(
        "%-24s  %s  %s  %s  %s"
        % ("الإجمالي", ar(totals["lessons"]), ar(totals["ready"]), ar(totals["passages"]), ar(totals["questions"]))
    )

    lines.append("")
    if issues.has_errors:
        lines.append("النتيجة: %s خطأ، %s تحذير → المحتوى مرفوض." % (ar(len(issues.errors)), ar(len(issues.warnings))))
    else:
        lines.append(
            "النتيجة: صفر أخطاء، %s تحذير → المحتوى سليم." % ar(len(issues.warnings))
        )
    return "\n".join(lines)


def run_full_validation():
    """نقطة الدخول الموحدة: تقرأ المحتوى، تتحقق منه، وتعيد (issues, stats, report)."""
    issues = Issues()
    lessons = validate_lessons_file(issues)
    lessons_by_id = {lesson["id"]: lesson for lesson in (lessons or []) if type(lesson.get("id")) is int}

    for lesson in lessons or []:
        if lesson.get("ready"):
            validate_ready_lesson(lesson, issues)

    banks = validate_banks(issues, lessons_by_id)
    stats = collect_stats(lessons, banks)
    report = build_report(issues, stats)
    return issues, stats, report
