#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""نَحْو — باني البيانات.

يشغّل التحقق أولًا، فإن سلم المحتوى ولّد:
    data/lessons.js     — قائمة الدروس الـ٥٣ مع أعداد القطع والأسئلة
    data/L01.js ...     — بنك قطع كل درس له ملفات (مستوى لكل ملف)
    data/build-info.json — معلومات البناء وملخص المجاميع وبصمات المصادر

يرفض البناء ويخرج برمز 1 عند وجود أي خطأ في المحتوى، ولا يكتب شيئًا حينها.

الاستخدام:
    python3 tools/build_data.py
"""

import datetime
import hashlib
import json
import os
import re
import sys

from content_lib import (
    DATA_DIR,
    LESSONS_PATH,
    BUILD_INFO_PATH,
    PASSAGES_DIR,
    ROOT,
    LESSON_CONTENT_KEYS,
    SCHEMA_VERSION,
    run_full_validation,
    ar,
    rel_path,
)

GENERATOR = "tools/build_data.py"
MARKER = "مولّد آليًا بواسطة " + GENERATOR
_BANK_FILE = re.compile(r"^L(\d{2})\.js$")

_JS_LESSONS_TEMPLATE = """/* نَحْو — بيانات الدروس ({marker})
   المصدر: content/lessons.json — لا تُعدّل هذا الملف يدويًا؛ أعد توليدها بـ:
   python3 tools/build_data.py
   وقت التوليد: {stamp} */
(function () {{
  "use strict";
  var root = typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : {{}});
  root.NahwData = root.NahwData || {{}};
  root.NahwData.schemaVersion = {schema_version};
  root.NahwData.build = {build};
  root.NahwData.lessons = {lessons};
  root.NahwData.passages = root.NahwData.passages || {{}};
}})();
"""

_JS_BANK_TEMPLATE = """/* نَحْو — بنك قطع الدرس {lesson} ({marker})
   المصدر: content/passages/{folder}/ — لا تُعدّل هذا الملف يدويًا؛ أعد توليده بـ:
   python3 tools/build_data.py
   وقت التوليد: {stamp} */
(function () {{
  "use strict";
  var root = typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : {{}});
  root.NahwData = root.NahwData || {{}};
  root.NahwData.passages = root.NahwData.passages || {{}};
  root.NahwData.passages["{key}"] = {payload};
}})();
"""


def sha256_of(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def js_literal(payload):
    """تحويل كائن Python إلى نص JSON صالح داخل ملف JavaScript."""
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    return text.replace("</", "<\\/")


def write_atomic(path, text):
    tmp = str(path) + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    os.replace(tmp, path)


def build_payload(lessons, banks, stats):
    """يجهز كائنات البيانات التي ستُكتب إلى ملفات data."""
    by_lesson = stats.get("byLesson", {})
    generated_at = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    lesson_entries = []
    for lesson in lessons:
        entry = {
            "id": lesson.get("id"),
            "title": lesson.get("title"),
            "section": lesson.get("section"),
            "ready": bool(lesson.get("ready")),
        }
        if entry["ready"]:
            for key in LESSON_CONTENT_KEYS:
                if key in lesson:
                    entry[key] = lesson[key]
        counts = by_lesson.get(entry["id"], {})
        entry["passageCount"] = counts.get("passages", 0)
        entry["questionCount"] = counts.get("questions", 0)
        lesson_entries.append(entry)

    bank_entries = {}
    for lesson_id, bank in sorted(banks.items()):
        key = "L%02d" % lesson_id
        level_path = PASSAGES_DIR / key
        levels = {}
        for level in sorted(bank.get("levels", {})):
            try:
                with open(level_path / ("level%d.json" % level), "r", encoding="utf-8-sig") as handle:
                    data = json.load(handle)
            except (OSError, json.JSONDecodeError):
                continue
            passages = data.get("passages") if isinstance(data, dict) else None
            if isinstance(passages, list):
                levels[str(level)] = passages
        if not levels:
            continue
        counts = by_lesson.get(lesson_id, {})
        bank_entries[key] = {
            "lesson": lesson_id,
            "passageCount": counts.get("passages", 0),
            "questionCount": counts.get("questions", 0),
            "levels": levels,
        }

    totals = {
        "lessons": len(lesson_entries),
        "readyLessons": sum(1 for lesson in lesson_entries if lesson["ready"]),
        "banks": len(bank_entries),
        "passages": sum(entry["passageCount"] for entry in lesson_entries),
        "questions": sum(entry["questionCount"] for entry in lesson_entries),
    }
    build_info = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": generated_at,
        "generator": GENERATOR,
        "totals": totals,
    }
    return generated_at, lesson_entries, bank_entries, totals, build_info


def write_outputs(lessons, banks, generated_at, build_info):
    """يكتب ملفات data وأسطر تقرير الكتابة، ويعيد قائمة المخرجات."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    outputs = []

    sources = {"content/lessons.json": sha256_of(LESSONS_PATH)}

    lessons_text = _JS_LESSONS_TEMPLATE.format(
        marker=MARKER,
        stamp=generated_at,
        schema_version=SCHEMA_VERSION,
        build=js_literal(build_info),
        lessons=js_literal(lessons),
    )
    lessons_path = DATA_DIR / "lessons.js"
    write_atomic(lessons_path, lessons_text)
    outputs.append((rel_path(lessons_path), len(lessons_text.encode("utf-8"))))

    for key, bank in sorted(banks.items()):
        for level in sorted(bank.get("levels", {})):
            level_path = PASSAGES_DIR / key / ("level%s.json" % level)
            if level_path.exists():
                sources["content/passages/%s/level%s.json" % (key, level)] = sha256_of(level_path)

        bank_text = _JS_BANK_TEMPLATE.format(
            lesson=ar(bank["lesson"]),
            marker=MARKER,
            stamp=generated_at,
            folder=key,
            key=key,
            payload=js_literal(bank),
        )
        bank_path = DATA_DIR / (key + ".js")
        write_atomic(bank_path, bank_text)
        outputs.append((rel_path(bank_path), len(bank_text.encode("utf-8"))))

    # حذف ملفات بنوك قديمة تولّدها الأداة ولم يعد لها مصدر.
    generated_files = {key + ".js" for key in banks}
    for entry in sorted(DATA_DIR.glob("L*.js")):
        if entry.name in generated_files:
            continue
        try:
            if MARKER in entry.read_text(encoding="utf-8"):
                entry.unlink()
                outputs.append((rel_path(entry), None))
        except OSError:
            pass

    build_info = dict(build_info)
    build_info["sources"] = sources
    build_info["outputs"] = [
        {"path": path, "bytes": size, "sha256": sha256_of(ROOT / path)}
        for path, size in outputs
        if size is not None and (ROOT / path).exists()
    ]
    info_path = BUILD_INFO_PATH
    write_atomic(info_path, json.dumps(build_info, ensure_ascii=False, indent=2) + "\n")
    outputs.append((rel_path(info_path), info_path.stat().st_size))
    return outputs, sources


def previous_build_info():
    try:
        with open(BUILD_INFO_PATH, "r", encoding="utf-8-sig") as handle:
            data = json.load(handle)
        return data if isinstance(data, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def sw_stores_lessons():
    try:
        return "data/lessons.js" in (ROOT / "sw.js").read_text(encoding="utf-8")
    except OSError:
        return False


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

    issues, stats, report = run_full_validation()
    print(report)

    if issues.has_errors:
        print("")
        print("أُلغي البناء: أصلح الأخطاء أعلاه ثم أعد تشغيل الأداة.")
        return 1

    # نعيد قراءة الدروس من المصدر مباشرةً (مرّت التحقق سالمة).
    with open(LESSONS_PATH, "r", encoding="utf-8-sig") as handle:
        lessons = json.load(handle).get("lessons", [])

    generated_at, lesson_entries, bank_entries, totals, build_info = build_payload(lessons, stats.get("banks", {}), stats)
    outputs, sources = write_outputs(lesson_entries, bank_entries, generated_at, build_info)

    print("")
    print("=== البناء ===")
    for path, size in outputs:
        if size is None:
            print("حُذف: %s (ملف بنك بلا مصدر)" % path)
        else:
            print("كُتب: %s (%s بايت)" % (path, ar(size)))
    print(
        "المجاميع: %s درسًا (%s جاهز) · %s بنك · %s قطعة · %s سؤال"
        % (ar(totals["lessons"]), ar(totals["readyLessons"]), ar(totals["banks"]), ar(totals["passages"]), ar(totals["questions"]))
    )

    previous = previous_build_info()
    changed = True
    if isinstance(previous, dict) and isinstance(previous.get("sources"), dict):
        old_sources = previous["sources"]
        changed = any(old_sources.get(name) != digest for name, digest in sources.items())
        changed = changed or any(name not in sources for name in old_sources)
    if changed and sw_stores_lessons():
        print("تذكير: تغيّر المحتوى — إن كان الموقع مخدومًا عبر HTTP فبِثْ CACHE_NAME في sw.js لتحديث النسخة المخزنة.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
