#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""نَحْو — فاحص المحتوى.

يفحص content/lessons.json وبنوك القطع في content/passages ويطبع تقريرًا
بالأخطاء والتحذيرات وجدولًا إحصائيًا.

الاستخدام:
    python3 tools/validate_content.py

رمز الخروج: 0 عند سلامة المحتوى، 1 عند وجود أخطاء.
"""

import sys

from content_lib import run_full_validation


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

    issues, stats, report = run_full_validation()
    print(report)
    return 1 if issues.has_errors else 0


if __name__ == "__main__":
    sys.exit(main())
