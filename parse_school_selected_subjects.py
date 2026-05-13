#!/usr/bin/env python3
"""
Create factual subject data for school-opened elective subjects.

Reads:
- app/src/data/json/school.json
- 2022개정-고등학교과목선택안내자료(2024.4.1.)-경기도교육청.pdf

Writes:
- data/school-selected-subjects.json
- app/src/data/json/school-selected-subjects.json
"""

from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Any

import pdfplumber
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parent
SCHOOL_JSON = ROOT / "app" / "src" / "data" / "json" / "school.json"
PDF_GLOB = "2022개정-고등학교과목선택안내자료*.pdf"
OUT_DATA = ROOT / "data" / "school-selected-subjects.json"
OUT_APP = ROOT / "app" / "src" / "data" / "json" / "school-selected-subjects.json"


SUPPLEMENTAL_SUBJECTS: dict[str, dict[str, Any]] = {
    "\uad00\uad11 \uc77c\ubcf8\uc5b4": {
        "sourceStatus": "supplemented",
        "source": {
            "type": "supplemental",
            "file": "2022 \uac1c\uc815 \uad50\uc721\uacfc\uc815 \ucd1d\ub860 / \uad00\uad11\u00b7\ub808\uc800 \uc804\ubb38 \uad50\uacfc \uad50\uc721\uacfc\uc815",
            "pdfPage": None,
            "guidePage": None,
        },
        "area": "\uad00\uad11\u00b7\ub808\uc800",
        "category": "\uc9c4\ub85c \uc120\ud0dd(\uc804\ubb38 \uad50\uacfc)",
        "curriculumTrack": "\uc804\uacf5 \uc77c\ubc18",
        "description": "\uad00\uad11\u00b7\ub808\uc800 \ubd84\uc57c\uc758 \uc678\uad6d\uc778 \uace0\uac1d \uc11c\ube44\uc2a4 \uc0c1\ud669\uc5d0\uc11c \ud65c\uc6a9\ud558\ub294 \uc77c\ubcf8\uc5b4 \uc758\uc0ac\uc18c\ud1b5\uc744 \ub2e4\ub8e8\ub294 \uc804\uacf5 \uc77c\ubc18 \uacfc\ubaa9.",
        "contentCategories": [
            "\uad00\uad11 \uc678\uad6d\uc5b4 \uc758\uc0ac\uc18c\ud1b5",
            "\uc5ec\ud589\u00b7\uc219\ubc15\u00b7\uc2dd\uc74c\ub8cc \uc11c\ube44\uc2a4",
            "\uad00\uad11 \uc548\ub0b4 \ubc0f \ud574\uc124",
        ],
        "contentElements": [
            "\uad00\uad11 \uae30\ucd08 \ud68c\ud654",
            "\uc5ec\ud589 \uc11c\ube44\uc2a4 \uc0c1\ub2f4\uacfc \uc608\uc57d",
            "\ud638\ud154 \ubc0f \uc2dd\uc74c\ub8cc \uc11c\ube44\uc2a4 \uc758\uc0ac\uc18c\ud1b5",
            "\uad00\uad11 \uc0c1\ud488 \uc124\uba85\uacfc \ud310\ub9e4",
            "\ud55c\uad6d \ubb38\ud654\uc640 \uad00\uad11\uc9c0 \uc548\ub0b4",
        ],
        "relatedDepartments": [
            "\uad00\uad11\uacbd\uc601\ud559\uacfc",
            "\ud638\ud154\uacbd\uc601\ud559\uacfc",
            "\ubb38\ud654\uad00\uad11\ud559\uacfc",
            "\ucee8\ubca4\uc158\ud559\uacfc",
        ],
        "relatedCareers": [
            "\uad00\uad11\ud1b5\uc5ed\uc548\ub0b4\uc0ac",
            "\uad6d\ub0b4\uc5ec\ud589\uc548\ub0b4\uc0ac",
            "\uc5ec\ud589 \uc0ac\ubb34\uc6d0",
            "\ud638\ud154\ub9ac\uc5b4",
            "\uba74\uc138\uc810 \ud310\ub9e4\uc6d0",
        ],
        "supplementSources": [
            {
                "title": "\uad00\uad11\u00b7\ub808\uc800 \uc804\ubb38 \uad50\uacfc \uad50\uc721\uacfc\uc815",
                "publisher": "\uad50\uc721\ubd80/\ud55c\uad6d\uc9c1\uc5c5\ub2a5\ub825\uc5f0\uad6c\uc6d0",
                "url": "https://www.krivet.re.kr/kor/sub.do?menuSn=12&pstNo=E120230349",
            },
            {
                "title": "\ucd08\u00b7\uc911\ub4f1\ud559\uad50 \uad50\uc721\uacfc\uc815 \ucd1d\ub860",
                "publisher": "\uad50\uc721\ubd80",
                "url": "https://fliphtml5.com/buyec/mqvu/",
            },
        ],
    },
    "\uad00\uad11 \uc911\uad6d\uc5b4": {
        "sourceStatus": "supplemented",
        "source": {
            "type": "supplemental",
            "file": "2022 \uac1c\uc815 \uad50\uc721\uacfc\uc815 \ucd1d\ub860 / \uad00\uad11\u00b7\ub808\uc800 \uc804\ubb38 \uad50\uacfc \uad50\uc721\uacfc\uc815",
            "pdfPage": None,
            "guidePage": None,
        },
        "area": "\uad00\uad11\u00b7\ub808\uc800",
        "category": "\uc9c4\ub85c \uc120\ud0dd(\uc804\ubb38 \uad50\uacfc)",
        "curriculumTrack": "\uc804\uacf5 \uc77c\ubc18",
        "description": "\uad00\uad11\u00b7\ub808\uc800 \ubd84\uc57c\uc758 \uc678\uad6d\uc778 \uace0\uac1d \uc11c\ube44\uc2a4 \uc0c1\ud669\uc5d0\uc11c \ud65c\uc6a9\ud558\ub294 \uc911\uad6d\uc5b4 \uc758\uc0ac\uc18c\ud1b5\uc744 \ub2e4\ub8e8\ub294 \uc804\uacf5 \uc77c\ubc18 \uacfc\ubaa9.",
        "contentCategories": [
            "\uad00\uad11 \uc678\uad6d\uc5b4 \uc758\uc0ac\uc18c\ud1b5",
            "\uc5ec\ud589\u00b7\uc219\ubc15\u00b7\uc2dd\uc74c\ub8cc \uc11c\ube44\uc2a4",
            "\uad00\uad11 \uc548\ub0b4 \ubc0f \ud574\uc124",
        ],
        "contentElements": [
            "\uad00\uad11 \uae30\ucd08 \ud68c\ud654",
            "\uc5ec\ud589 \uc11c\ube44\uc2a4 \uc0c1\ub2f4\uacfc \uc608\uc57d",
            "\ud638\ud154 \ubc0f \uc2dd\uc74c\ub8cc \uc11c\ube44\uc2a4 \uc758\uc0ac\uc18c\ud1b5",
            "\uad00\uad11 \uc0c1\ud488 \uc124\uba85\uacfc \ud310\ub9e4",
            "\ud55c\uad6d \ubb38\ud654\uc640 \uad00\uad11\uc9c0 \uc548\ub0b4",
        ],
        "relatedDepartments": [
            "\uad00\uad11\uacbd\uc601\ud559\uacfc",
            "\ud638\ud154\uacbd\uc601\ud559\uacfc",
            "\ubb38\ud654\uad00\uad11\ud559\uacfc",
            "\ucee8\ubca4\uc158\ud559\uacfc",
        ],
        "relatedCareers": [
            "\uad00\uad11\ud1b5\uc5ed\uc548\ub0b4\uc0ac",
            "\uad6d\ub0b4\uc5ec\ud589\uc548\ub0b4\uc0ac",
            "\uc5ec\ud589 \uc0ac\ubb34\uc6d0",
            "\ud638\ud154\ub9ac\uc5b4",
            "\uba74\uc138\uc810 \ud310\ub9e4\uc6d0",
        ],
        "supplementSources": [
            {
                "title": "\uad00\uad11\u00b7\ub808\uc800 \uc804\ubb38 \uad50\uacfc \uad50\uc721\uacfc\uc815",
                "publisher": "\uad50\uc721\ubd80/\ud55c\uad6d\uc9c1\uc5c5\ub2a5\ub825\uc5f0\uad6c\uc6d0",
                "url": "https://www.krivet.re.kr/kor/sub.do?menuSn=12&pstNo=E120230349",
            },
            {
                "title": "\ucd08\u00b7\uc911\ub4f1\ud559\uad50 \uad50\uc721\uacfc\uc815 \ucd1d\ub860",
                "publisher": "\uad50\uc721\ubd80",
                "url": "https://fliphtml5.com/buyec/mqvu/",
            },
        ],
    },
    "\ube44\ud310\uc801 \uc9c8\ubb38\uacfc \ucc3d\uc758\uc801 \ud574\uacb0": {
        "sourceStatus": "supplemented_partial",
        "source": {
            "type": "supplemental",
            "file": "\uacbd\uae30\ub3c4 \uace0\uc2dc \uc678 \uacfc\ubaa9 \uc2b9\uc778 \ubaa9\ub85d / 2026\ub144 \uace0\ub4f1\ud559\uad50 \uace0\uc2dc \uc678 \uacfc\ubaa9 \uac1c\uc124 \uae38\ub77c\uc7a1\uc774",
            "pdfPage": None,
            "guidePage": None,
        },
        "area": "\uad50\uc591",
        "category": "\uc735\ud569 \uc120\ud0dd",
        "curriculumTrack": "\ubcf4\ud1b5 \uad50\uacfc",
        "englishName": "Critical Inquiry and Creative Problem Solving",
        "credits": {"defaultCredits": 2, "sourceCreditText": "1(2)"},
        "assessment": {
            "achievementLevel": None,
            "gradeReported": False,
            "passFail": True,
        },
        "description": "\uc9c8\ubb38\uc744 \ud1b5\ud574 \ubb38\uc81c\ub97c \uc0c8\ub86d\uac8c \uc815\uc758\ud558\uace0, \uc790\ub8cc \ud0d0\uad6c\uc640 \ud611\uc5c5\uc744 \ubc14\ud0d5\uc73c\ub85c \ucc3d\uc758\uc801\uc778 \ud574\uacb0 \ubc29\uc548\uc744 \uad6c\uc131\ud558\ub294 \uad50\uc591 \uc735\ud569 \uc120\ud0dd \uacfc\ubaa9.",
        "contentCategories": [],
        "contentElements": [],
        "sourceNote": "\uacfc\ubaa9\uba85, \uc601\ubb38\uba85, \uad50\uacfc\uad70, \uc120\ud0dd \uc720\ud615, \ud3c9\uac00 \ucc98\ub9ac\ub294 \uacbd\uae30\ub3c4\uad50\uc721\uccad \uc790\ub8cc\uc5d0\uc11c \ud655\uc778. \uc138\ubd80 \ub0b4\uc6a9 \uccb4\uacc4\ub294 \uacfc\ubaa9 \uc6b4\uc601\uacc4\ud68d\uc11c \ud655\uc778\uc774 \ud544\uc694\ud568.",
        "supplementSources": [
            {
                "title": "2026\ub144 \uace0\ub4f1\ud559\uad50 \uace0\uc2dc \uc678 \uacfc\ubaa9 \uac1c\uc124 \uae38\ub77c\uc7a1\uc774",
                "publisher": "\uacbd\uae30\ub3c4\uad50\uc721\uccad",
                "url": "https://www.goe.go.kr/resource/goe/na/bbs_2441/2025/05/430a64d5-458b-4bba-9529-64f75f1c5c20.pdf",
            },
            {
                "title": "\uacbd\uae30\ub3c4 \uace0\uc2dc \uc678 \uacfc\ubaa9 \uc2b9\uc778 \ubaa9\ub85d(2026.04.15.)",
                "publisher": "\uacbd\uae30\ub3c4\uad50\uc721\uccad",
                "file": "\uacbd\uae30\ub3c4 \uace0\uc2dc \uc678 \uacfc\ubaa9 \uc2b9\uc778  \ubaa9\ub85d(2026.04.15._2022\uac1c\uc815\uad50\uc721\uacfc\uc815).xlsx",
                "row": 11,
                "courseCode": "1003000761",
            },
        ],
    },
    "\uc2dd\ud488\uacfc \uc601\uc591": {
        "sourceStatus": "supplemented",
        "source": {
            "type": "supplemental",
            "file": "2022 \uac1c\uc815 \uc2dd\ud488\u00b7\uc870\ub9ac \uc804\ubb38 \uad50\uacfc \uad50\uc721\uacfc\uc815",
            "pdfPage": None,
            "guidePage": None,
        },
        "area": "\uc2dd\ud488\u00b7\uc870\ub9ac",
        "category": "\uc9c4\ub85c \uc120\ud0dd(\uc804\ubb38 \uad50\uacfc)",
        "curriculumTrack": "\uc804\uacf5 \uc77c\ubc18",
        "description": "\uc2dd\ud488\uacfc \uc601\uc591\uc5d0 \ub300\ud55c \uae30\ucd08 \uc9c0\uc2dd\uc744 \ud1a0\ub300\ub85c \uac74\uac15\ud55c \uc2dd\uc0dd\ud65c\uacfc \uc2dd\ud488\u00b7\uc870\ub9ac \ubd84\uc57c\uc758 \uae30\ucd08\ub97c \ub2e4\ub8e8\ub294 \uc804\uacf5 \uc77c\ubc18 \uacfc\ubaa9.",
        "contentCategories": [
            "\uc601\uc591\uacfc \uac74\uac15",
            "\uc2dd\ud488\uc758 \ud2b9\uc131",
            "\uc2dd\ud488\u00b7\uc870\ub9ac \uc9c4\ub85c",
        ],
        "contentElements": [
            "\uc601\uc591\uc18c\uc640 \uc2dd\uc0dd\ud65c",
            "\uc0dd\uc560 \uc8fc\uae30\uc640 \uc601\uc591",
            "\uc2dd\ud488\uc758 \uc131\ubd84\uacfc \ud2b9\uc131",
            "\uc2dd\ud488 \uac00\uacf5\uacfc \uc800\uc7a5",
            "\uc870\ub9ac\u00b7\uc2dd\uc74c\ub8cc \ubd84\uc57c \uc9c4\ub85c \ud0d0\uc0c9",
        ],
        "relatedDepartments": [
            "\uc2dd\ud488\uc601\uc591\ud559\uacfc",
            "\uc2dd\ud488\uacf5\ud559\uacfc",
            "\uc870\ub9ac\ud559\uacfc",
            "\uc2dd\uc74c\ub8cc\uacbd\uc601\ud559\uacfc",
        ],
        "relatedCareers": [
            "\uc601\uc591\uc0ac",
            "\uc870\ub9ac\uc0ac",
            "\uc2dd\ud488 \uc5f0\uad6c\uc6d0",
            "\uc2dd\ud488 \ud488\uc9c8 \uad00\ub9ac\uc6d0",
            "\ucee4\ud478 \uc804\ubb38\uac00",
        ],
        "supplementSources": [
            {
                "title": "\uc2dd\ud488\u00b7\uc870\ub9ac \uc804\ubb38 \uad50\uacfc \uad50\uc721\uacfc\uc815",
                "publisher": "\uad50\uc721\ubd80/\ud55c\uad6d\uc9c1\uc5c5\ub2a5\ub825\uc5f0\uad6c\uc6d0",
                "url": "https://www.krivet.re.kr/kor/sub.do?menuSn=12&pstNo=E120230320",
            },
            {
                "title": "\ucd08\u00b7\uc911\ub4f1\ud559\uad50 \uad50\uc721\uacfc\uc815 \ucd1d\ub860",
                "publisher": "\uad50\uc721\ubd80",
                "url": "https://fliphtml5.com/buyec/mqvu/",
            },
        ],
    },
    "\uc778\uacf5\uc9c0\ub2a5 \uc724\ub9ac": {
        "sourceStatus": "supplemented_partial",
        "source": {
            "type": "supplemental",
            "file": "\uacbd\uae30\ub3c4 \uace0\uc2dc \uc678 \uacfc\ubaa9 \uc2b9\uc778 \ubaa9\ub85d",
            "pdfPage": None,
            "guidePage": None,
        },
        "area": "\uad50\uc591",
        "category": "\uace0\uc2dc \uc678 \uacfc\ubaa9",
        "curriculumTrack": "\ubcf4\ud1b5 \uad50\uacfc",
        "englishName": "AI Ethics",
        "credits": {"defaultCredits": 2},
        "assessment": {
            "achievementLevel": None,
            "gradeReported": False,
            "passFail": True,
        },
        "description": "\uc778\uacf5\uc9c0\ub2a5 \uae30\uc220\uc774 \uac1c\uc778\uacfc \uc0ac\ud68c\uc5d0 \ubbf8\uce58\ub294 \uc601\ud5a5\uc744 \uc0b4\ud53c\uace0, \ucc45\uc784\uc131\u00b7\uacf5\uc815\uc131\u00b7\ud22c\uba85\uc131 \ub4f1 \uc724\ub9ac \uc7c1\uc810\uc744 \ud0d0\uad6c\ud558\ub294 \uad50\uc591 \uacfc\ubaa9.",
        "contentCategories": [
            "\uc778\uacf5\uc9c0\ub2a5\uacfc \uc0ac\ud68c",
            "\uc778\uacf5\uc9c0\ub2a5 \uc724\ub9ac \uc7c1\uc810",
            "\ucc45\uc784 \uc788\ub294 \uae30\uc220 \ud65c\uc6a9",
        ],
        "contentElements": [
            "\uc778\uacf5\uc9c0\ub2a5\uc758 \uc0ac\ud68c\uc801 \uc601\ud5a5",
            "\ub370\uc774\ud130\uc640 \ud504\ub77c\uc774\ubc84\uc2dc",
            "\ud3b8\ud5a5\uacfc \uacf5\uc815\uc131",
            "\ucc45\uc784\uc131\uacfc \uc548\uc804\uc131",
            "\uc778\uac04 \uc911\uc2ec\uc758 \uc778\uacf5\uc9c0\ub2a5 \ud65c\uc6a9",
        ],
        "sourceNote": "\uacfc\ubaa9\uba85, \uc601\ubb38\uba85, \uad50\uacfc\uad70\uc740 \uacbd\uae30\ub3c4\uad50\uc721\uccad \uc2b9\uc778 \ubaa9\ub85d\uc5d0\uc11c \ud655\uc778. \uc138\ubd80 \ub0b4\uc6a9 \uccb4\uacc4\ub294 \uc77c\ubc18\uc801 \uc778\uacf5\uc9c0\ub2a5 \uc724\ub9ac \uad50\uc721 \ubc94\uc8fc\ub97c \ubc14\ud0d5\uc73c\ub85c \ubcf4\uc644\ud55c \uc784\uc2dc \uc694\uc57d\uc774\uba70, \ud559\uad50 \uc6b4\uc601\uacc4\ud68d\uc11c \ud655\uc778\uc774 \ud544\uc694\ud568.",
        "supplementSources": [
            {
                "title": "\uacbd\uae30\ub3c4 \uace0\uc2dc \uc678 \uacfc\ubaa9 \uc2b9\uc778 \ubaa9\ub85d(2026.04.15.)",
                "publisher": "\uacbd\uae30\ub3c4\uad50\uc721\uccad",
                "file": "\uacbd\uae30\ub3c4 \uace0\uc2dc \uc678 \uacfc\ubaa9 \uc2b9\uc778  \ubaa9\ub85d(2026.04.15._2022\uac1c\uc815\uad50\uc721\uacfc\uc815).xlsx",
                "row": 19,
                "courseCode": "1003000832",
            },
        ],
    },
    "\ud504\ub85c\uadf8\ub798\ubc0d": {
        "sourceStatus": "supplemented",
        "source": {
            "type": "supplemental",
            "file": "2022 \uac1c\uc815 \uc815\ubcf4\u00b7\ud1b5\uc2e0 \uc804\ubb38 \uad50\uacfc \uad50\uc721\uacfc\uc815",
            "pdfPage": None,
            "guidePage": None,
        },
        "area": "\uc815\ubcf4\u00b7\ud1b5\uc2e0",
        "category": "\uc9c4\ub85c \uc120\ud0dd(\uc804\ubb38 \uad50\uacfc)",
        "curriculumTrack": "\uc804\uacf5 \uc77c\ubc18",
        "description": "\ud504\ub85c\uadf8\ub798\ubc0d\uc758 \uae30\ubcf8 \uac1c\ub150\uacfc \uc808\ucc28\uc801 \ubb38\uc81c \ud574\uacb0\uc744 \uc775\ud788\uace0, \ud504\ub85c\uadf8\ub7a8\uc744 \uc791\uc131\u00b7\uad6c\ud604\ud558\ub294 \uc815\ubcf4\u00b7\ud1b5\uc2e0 \uc804\uacf5 \uc77c\ubc18 \uacfc\ubaa9.",
        "contentCategories": [
            "\ud504\ub85c\uadf8\ub798\ubc0d \uae30\ucd08",
            "\uc54c\uace0\ub9ac\uc998\uacfc \ubb38\uc81c \ud574\uacb0",
            "\ud504\ub85c\uadf8\ub7a8 \uad6c\ud604",
        ],
        "contentElements": [
            "\ud504\ub85c\uadf8\ub798\ubc0d \uc5b8\uc5b4\uc758 \uae30\ubcf8 \ubb38\ubc95",
            "\ubcc0\uc218\uc640 \uc790\ub8cc\ud615",
            "\uc81c\uc5b4 \uad6c\uc870",
            "\ud568\uc218\uc640 \ubaa8\ub4c8",
            "\ub514\ubc84\uae45\uacfc \ud14c\uc2a4\ud2b8",
            "\uac04\ub2e8\ud55c \uc751\uc6a9 \ud504\ub85c\uadf8\ub7a8 \uad6c\ud604",
        ],
        "relatedDepartments": [
            "\ucef4\ud4e8\ud130\uacf5\ud559\uacfc",
            "\uc18c\ud504\ud2b8\uc6e8\uc5b4\ud559\uacfc",
            "\uc778\uacf5\uc9c0\ub2a5\ud559\uacfc",
            "\uc815\ubcf4\ud1b5\uc2e0\uacf5\ud559\uacfc",
        ],
        "relatedCareers": [
            "\uc18c\ud504\ud2b8\uc6e8\uc5b4 \uac1c\ubc1c\uc790",
            "\uc751\uc6a9 \ud504\ub85c\uadf8\ub798\uba38",
            "\uc2dc\uc2a4\ud15c \ud504\ub85c\uadf8\ub798\uba38",
            "\ub370\uc774\ud130\ubca0\uc774\uc2a4 \uac1c\ubc1c\uc790",
            "\uc778\uacf5\uc9c0\ub2a5 \uac1c\ubc1c\uc790",
        ],
        "supplementSources": [
            {
                "title": "\uc815\ubcf4\u00b7\ud1b5\uc2e0 \uc804\ubb38 \uad50\uacfc \uad50\uc721\uacfc\uc815",
                "publisher": "\uad50\uc721\ubd80/\ud55c\uad6d\uc9c1\uc5c5\ub2a5\ub825\uc5f0\uad6c\uc6d0",
                "url": "https://www.krivet.re.kr/kor/sub.do?menuSn=12&pstNo=E120230354",
            },
            {
                "title": "\ucd08\u00b7\uc911\ub4f1\ud559\uad50 \uad50\uc721\uacfc\uc815 \ucd1d\ub860",
                "publisher": "\uad50\uc721\ubd80",
                "url": "https://fliphtml5.com/buyec/mqvu/",
            },
        ],
    },
    "\ud604\ub300 \uc138\uacc4\uc758 \ubcc0\ud654": {
        "sourceStatus": "supplemented",
        "source": {
            "type": "supplemental",
            "file": "2022\uac1c\uc815 \uad50\uc721\uacfc\uc815 \uace0\ub4f1\ud559\uad50 \uacfc\ubaa9 \uc548\ub0b4\uc11c",
            "pdfPage": 296,
            "guidePage": 296,
        },
        "area": "\uc0ac\ud68c(\uc5ed\uc0ac/\ub3c4\ub355 \ud3ec\ud568)",
        "category": "\uc9c4\ub85c \uc120\ud0dd",
        "curriculumTrack": "\uc678\uad6d\uc5b4\u00b7\uad6d\uc81c \uacc4\uc5f4",
        "credits": {"creditRange": [3, 5], "sourceCreditText": "\uc77c\ubc18\uace0 3~5\ud559\uc810"},
        "assessment": {
            "achievementLevel": "5\ub2e8\uacc4",
            "gradeReported": True,
            "passFail": False,
        },
        "description": "\uadfc\ub300 \uc774\ud6c4 \uad6d\uc81c \uc0ac\ud68c\uac00 \ud615\uc131\u00b7\ubc1c\uc804\ub418\ub294 \uacfc\uc815\uacfc \uadf8 \uc5ed\uc0ac\uac00 \ud604\uc7ac\uc5d0 \ubbf8\uce5c \uc601\ud5a5\uc744 \uc0b4\ud53c\uba70 \ubbf8\ub798\ub97c \uc804\ub9dd\ud558\ub294 \ub2a5\ub825\uc744 \uae30\ub974\ub294 \uc9c4\ub85c \uc120\ud0dd \uacfc\ubaa9.",
        "contentCategories": [
            "\uadfc\ub300\ud654\uc640 \uc81c\uad6d\uc8fc\uc758",
            "\uc138\uacc4 \ub300\uc804\uacfc \uad6d\uc81c \uc9c8\uc11c",
            "\ub0c9\uc804\uacfc \ud0c8\ub0c9\uc804",
            "\ud604\ub300 \uc138\uacc4\uc758 \uc0c8\ub85c\uc6b4 \uc774\uc288",
        ],
        "contentElements": [
            "\uc808\ub300\uc8fc\uc758 \uad6d\uac00\uc640 \uadfc\ub300\ud654\uc758 \uc2dc\uc791",
            "\uc2dc\ubbfc \ud601\uba85\uacfc \uc0b0\uc5c5 \ud601\uba85",
            "\uc720\ub7fd\uc758 \uc81c\uad6d\uc8fc\uc758\uc640 \uc2dd\ubbfc \uc9c0\ubc30 \uc800\ud56d",
            "\uc81c1\u00b72\ucc28 \uc138\uacc4 \ub300\uc804\uacfc \uad6d\uc81c \uc9c8\uc11c \ud615\uc131",
            "\ub0c9\uc804 \uccb4\uc81c\uc640 \ub0a8\u00b7\ubd81\ubc18\uad6c \uacbd\uc81c \uaca9\ucc28",
            "\ud0c8\ub0c9\uc804 \uc774\ud6c4 \uad6d\uc81c \uc9c8\uc11c",
            "\uc2e0\uc790\uc720\uc8fc\uc758, \ud658\uacbd, \uc778\uad8c, \ud14c\ub7ec",
            "\uc911\uad6d\uc758 \ubd80\uc0c1\uacfc \ubbf8\u00b7\uc911 \uac08\ub4f1",
        ],
        "relatedDepartments": [
            "\uc0ac\ud559\uacfc",
            "\uad6d\uc81c\ud559\uacfc",
            "\uad6d\uc81c\uad00\uacc4\ud559\uacfc",
            "\ubb38\ud654\ucf58\ud150\uce20\ud559\uacfc",
        ],
        "relatedCareers": [
            "\uc5ed\uc0ac\ud559\uc790",
            "\uc5ed\uc0ac \uad50\uc0ac",
            "\uad6d\uc81c \uad00\uacc4 \uc804\ubb38\uac00",
            "\ubb38\ud654 \uae30\ud68d\uc790",
        ],
        "supplementSources": [
            {
                "title": "2022\uac1c\uc815 \uad50\uc721\uacfc\uc815 \uace0\ub4f1\ud559\uad50 \uacfc\ubaa9 \uc548\ub0b4\uc11c",
                "publisher": "\uc778\ucc9c\uad11\uc5ed\uc2dc\uad50\uc721\uccad",
                "url": "https://fliphtml5.com/buyec/bbom/2022%EA%B0%9C%EC%A0%95_%EA%B5%90%EC%9C%A1%EA%B3%BC%EC%A0%95_%EA%B3%A0%EB%93%B1%ED%95%99%EA%B5%90_%EA%B3%BC%EB%AA%A9_%EC%95%88%EB%82%B4%EC%84%9C/",
                "page": 296,
            },
        ],
    },
}


GUIDE_RANGES = [
    (16, 31, "국어"),
    (32, 51, "수학"),
    (56, 68, "영어"),
    (74, 96, "사회"),
    (102, 129, "과학"),
    (136, 155, "체육"),
    (160, 216, "예술"),
    (222, 228, "기술·가정"),
    (229, 234, "정보"),
    (240, 274, "제2외국어/한문"),
    (280, 290, "교양"),
]

NORMALIZED_ALIASES = {
    "기술가정": "기술가정",
    "금융과경제생활": "금융과경제생활",
    "세포와물질대사": "세포와물질대사",
    "합창합주": "합창합주",
}


def normalize_name(value: str) -> str:
    value = unicodedata.normalize("NFKC", value)
    value = value.replace("ㆍ", "·").replace("⋅", "·").replace("･", "·")
    value = re.sub(r"[\s·,/()［\]\[\]<>]", "", value)
    return NORMALIZED_ALIASES.get(value, value)


def compact_text(value: str) -> str:
    value = unicodedata.normalize("NFKC", value)
    value = value.replace("⋅", "·").replace("ㆍ", "·").replace("･", "·")
    value = value.replace("\uf077", " ").replace("\uf020", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def slugify_korean(name: str) -> str:
    aliases = {
        "경제": "economics",
        "경제 수학": "economic_mathematics",
        "과학의 역사와 문화": "history_and_culture_of_science",
        "관광 일본어": "tourism_japanese",
        "관광 중국어": "tourism_chinese",
        "교육의 이해": "understanding_education",
        "금융과 경제생활": "finance_and_economic_life",
        "기술·가정": "technology_and_home_economics",
        "기하": "geometry",
        "기후변화와 지속가능한 세계": "climate_change_and_sustainable_world",
        "기후변화와 환경생태": "climate_change_and_ecology",
        "도시의 미래 탐구": "urban_future_exploration",
        "동아시아 역사 기행": "east_asian_history_journey",
        "드로잉": "drawing",
        "로봇과 공학세계": "robotics_and_engineering_world",
        "매체 의사소통": "media_communication",
        "문학과 영상": "literature_and_media",
        "물리학": "physics",
        "물질과 에너지": "matter_and_energy",
        "미술 감상과 비평": "art_appreciation_and_criticism",
        "미술과 매체": "art_and_media",
        "미적분Ⅱ": "calculus_2",
        "법과 사회": "law_and_society",
        "비판적 질문과 창의적 해결": "critical_questions_and_creative_solutions",
        "사회문제 탐구": "social_issues_exploration",
        "사회와 문화": "society_and_culture",
        "생명과학": "life_science",
        "생물의 유전": "genetics",
        "세계 문화와 영어": "world_culture_and_english",
        "세계사": "world_history",
        "세계시민과 지리": "global_citizenship_and_geography",
        "세포와 물질대사": "cells_and_metabolism",
        "식품과 영양": "food_and_nutrition",
        "실용 통계": "practical_statistics",
        "심화 영어 독해와 작문": "advanced_english_reading_and_writing",
        "아동발달과 부모": "child_development_and_parenting",
        "언어생활 탐구": "language_life_exploration",
        "언어생활과 한자": "language_life_and_hanja",
        "여행지리": "travel_geography",
        "역사로 탐구하는 현대 세계": "exploring_modern_world_through_history",
        "역학과 에너지": "mechanics_and_energy",
        "영미 문학 읽기": "english_literature_reading",
        "운동과 건강": "exercise_and_health",
        "윤리문제 탐구": "ethical_issues_exploration",
        "윤리와 사상": "ethics_and_thought",
        "융합과학 탐구": "convergence_science_exploration",
        "음악 감상과 비평": "music_appreciation_and_criticism",
        "음악 연주와 창작": "music_performance_and_creation",
        "인간과 심리": "humans_and_psychology",
        "인공지능 기초": "ai_basics",
        "인공지능 수학": "ai_mathematics",
        "인공지능 윤리": "ai_ethics",
        "인문학과 윤리": "humanities_and_ethics",
        "일본 문화": "japanese_culture",
        "일본어": "japanese",
        "일본어 회화": "japanese_conversation",
        "전자기와 양자": "electromagnetism_and_quantum",
        "정보": "information",
        "정보과학": "informatics_science",
        "정치": "politics",
        "주제 탐구 독서": "thematic_reading",
        "중국 문화": "chinese_culture",
        "중국어": "chinese",
        "중국어 회화": "chinese_conversation",
        "지구과학": "earth_science",
        "지구시스템과학": "earth_system_science",
        "지식 재산 일반": "intellectual_property_basics",
        "창의 공학 설계": "creative_engineering_design",
        "프로그래밍": "programming",
        "한국지리 탐구": "korean_geography_exploration",
        "한문 고전 읽기": "classical_chinese_reading",
        "합창·합주": "chorus_and_ensemble",
        "행성우주과학": "planetary_and_space_science",
        "현대 세계의 변화": "changes_in_the_modern_world",
        "현대사회와 윤리": "modern_society_and_ethics",
        "화학": "chemistry",
        "화학 반응의 세계": "world_of_chemical_reactions",
    }
    return aliases.get(name, normalize_name(name).lower())


def guide_area(guide_page: int | None) -> str | None:
    if guide_page is None:
        return None
    for start, end, area in GUIDE_RANGES:
        if start <= guide_page <= end:
            return area
    return None


def extract_school_subjects() -> tuple[list[str], dict[str, list[dict[str, Any]]]]:
    school = json.loads(SCHOOL_JSON.read_text(encoding="utf-8"))
    offerings: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for cohort_year, cohort in school.get("cohorts", {}).items():
        for group in cohort.get("selections", []):
            for option in group.get("options", []):
                offerings[option].append(
                    {
                        "cohort": cohort_year,
                        "grade": group.get("grade"),
                        "semester": group.get("semester"),
                        "groupId": group.get("id"),
                        "groupLabel": group.get("label"),
                        "choose": group.get("choose"),
                        "creditsEach": group.get("creditsEach"),
                        "totalCredits": group.get("totalCredits"),
                    }
                )

    return sorted(offerings), dict(offerings)


def find_pdf() -> Path:
    candidates = sorted(ROOT.glob(PDF_GLOB))
    if not candidates:
        raise FileNotFoundError(f"PDF not found: {PDF_GLOB}")
    return candidates[0]


def get_pdf_pages(pdf_path: Path) -> list[str]:
    reader = PdfReader(str(pdf_path))
    return [compact_text(page.extract_text() or "") for page in reader.pages]


def get_pdf_tables(pdf_path: Path) -> dict[int, list[list[list[str]]]]:
    tables_by_page: dict[int, list[list[list[str]]]] = {}
    with pdfplumber.open(str(pdf_path)) as pdf:
        for index, page in enumerate(pdf.pages, start=1):
            page_tables: list[list[list[str]]] = []
            for table in page.extract_tables() or []:
                clean_table: list[list[str]] = []
                for row in table:
                    clean_table.append([compact_text(cell or "") for cell in row])
                page_tables.append(clean_table)
            tables_by_page[index] = page_tables
    return tables_by_page


def build_subject_catalog(pages: list[str]) -> dict[str, dict[str, str]]:
    catalog: dict[str, dict[str, str]] = {}
    title_pattern = re.compile(
        r"((?:과학|체육|예술)\s*계열\s*)?(공통|일반|진로|융합)\s*(?:과목|선택)\s*"
        r"([^<>]{0,40}?)<([^<>]{1,30})>"
    )
    for text in pages:
        for match in title_pattern.finditer(text[:900]):
            prefix = compact_text(match.group(1) or "")
            base = match.group(2)
            name = compact_text(match.group(4))
            if not name or " " in name and len(name) > 25:
                continue
            category = "공통 과목" if base == "공통" else compact_text(f"{prefix} {base} 선택")
            catalog[normalize_name(name)] = {"name": name, "category": category}
    return catalog


def find_subject_page(name: str, pages: list[str]) -> tuple[int | None, str | None]:
    target = normalize_name(name)
    best: tuple[int | None, str | None, int] = (None, None, -1)

    for index, text in enumerate(pages):
        if index < 20:
            continue
        head = text[:1200]
        head_norm = normalize_name(head)
        title_norm = normalize_name(head[:240])
        score = -1

        bracket_names = re.findall(r"<([^<>]{1,30})>", head)
        for bracket_name in bracket_names[:3]:
            if normalize_name(bracket_name) == target:
                score = max(score, 100)

        title_markers = [
            f"공통과목{target}",
            f"공통선택{target}",
            f"일반선택{target}",
            f"진로선택{target}",
            f"융합선택{target}",
            f"과학계열진로선택{target}",
            f"체육계열진로선택{target}",
            f"예술계열진로선택{target}",
        ]
        if any(marker in title_norm for marker in title_markers):
            score = max(score, 80)

        if score > best[2]:
            best = (index + 1, text, score)

    if best[2] < 0:
        return None, None
    return best[0], best[1]


def extract_category(name: str, text: str | None) -> str | None:
    if not text:
        return None
    title = text[:260]
    m = re.search(r"((?:과학|체육|예술)\s*계열\s*)?(공통|일반|진로|융합)\s*선택", title)
    if m:
        prefix = compact_text(m.group(1) or "")
        base = m.group(2)
        return compact_text(f"{prefix} {base} 선택")

    m = re.search(r"(공통|일반|진로|융합)\s*선택", title)
    return f"{m.group(1)} 선택" if m else None


def extract_description(name: str, text: str | None) -> str | None:
    if not text:
        return None
    target = normalize_name(name)
    for match in re.finditer(r"<([^<>]{1,30})>", text[:900]):
        if normalize_name(match.group(1)) != target:
            continue
        rest = text[match.end() :]
        end = rest.find("어떤 과목일까요")
        if end > 0:
            desc = compact_text(rest[:end])
            if desc and not desc.startswith(name):
                return compact_text(f"{name}{desc}")
            return desc

    # Fallback for pages whose title is not enclosed in angle brackets.
    marker = "어떤 과목일까요"
    title_part = text[:700]
    marker_pos = title_part.find(marker)
    if marker_pos > 0:
        before = title_part[:marker_pos]
        name_pos = normalize_name(before).find(target)
        if name_pos >= 0:
            # Keep the original substring after the final visual occurrence of the name.
            occurrences = [m.end() for m in re.finditer(re.escape(name), before)]
            if occurrences:
                desc = compact_text(before[occurrences[-1] :])
                if len(desc) > 20:
                    return desc
    return None


def extract_credit_info(text: str | None) -> dict[str, Any]:
    if not text:
        return {}
    info: dict[str, Any] = {}
    m = re.search(r"기본\s*(\d+)\s*학점", text)
    if m:
        info["defaultCredits"] = int(m.group(1))
    m = re.search(r"(\d+)\s*~\s*(\d+)\s*학점\s*편성\s*가능", text)
    if m:
        info["creditRange"] = [int(m.group(1)), int(m.group(2))]
    m = re.search(r"증감범위\s*(\d+)\s*학점", text)
    if m:
        info["adjustmentRange"] = int(m.group(1))
    return info


def extract_assessment(text: str | None) -> dict[str, Any]:
    if not text:
        return {}
    first_part = text[:900]
    return {
        "achievementLevel": "5단계" if re.search(r"5\s*단\s*계", first_part) else None,
        "gradeReported": "등급" in first_part,
        "passFail": "P / F" in first_part or "P/F" in first_part,
    }


def split_bullets(value: str) -> list[str]:
    parts = re.split(r"\s*\s*", value)
    return [compact_text(part) for part in parts if compact_text(part)]


def extract_key_ideas(text: str | None) -> list[str]:
    if not text:
        return []
    m = re.search(r"핵심\s*아이디어\s*(.*?)\s*범주\s*내용 요소", text)
    if not m:
        m = re.search(r"핵심아이디어\s*(.*?)\s*범주\s*내용 요소", text)
    if not m:
        m = re.search(r"핵심아이디어\s*(.*?)\s*관련 학과", text)
    if not m:
        return []
    return split_bullets(m.group(1))


def extract_content_categories(tables: list[list[list[str]]] | None) -> list[str]:
    if not tables:
        return []
    categories: list[str] = []
    seen = set()

    for table in tables:
        flat = " ".join(cell for row in table for cell in row)
        if "범주" not in flat or "내용 요소" not in flat:
            continue
        for row in table:
            for cell in row:
                value = compact_text(cell)
                if not value:
                    continue
                if any(token in value for token in ["핵심", "범주", "내용 요소"]):
                    continue
                value = re.sub(r"지식\s*/?\s*‧\s*/?\s*이해", "", value).strip()
                if not value or "" in value or len(value) > 35:
                    continue
                if value not in seen:
                    seen.add(value)
                    categories.append(value)
    return categories


def extract_content_elements(text: str | None, content_categories: list[str]) -> list[str]:
    if not text:
        return []
    start = text.find("범주 내용 요소")
    if start < 0:
        return []
    chunk = text[start:]
    end_candidates = [
        pos
        for token in ["어떤 진로와 연결되어 있을까요", "관련 학과", "관련 직업", "진로 및 관련 직업"]
        if (pos := chunk.find(token)) > 0
    ]
    end = min(end_candidates) if end_candidates else min(len(chunk), 1800)
    chunk = chunk[:end]
    chunk = re.sub(r"^범주 내용 요소", "", chunk).strip()
    chunk = re.sub(r"지식\s*‧\s*이해", " ", chunk)

    elements = []
    for item in split_bullets(chunk):
        item = re.sub(r"\s*어떤 진로와 연결되어 있을까요\??.*$", "", item)
        item = compact_text(item)
        for category in sorted(content_categories, key=len, reverse=True):
            if item == category:
                item = ""
                break
            if item.endswith(f" {category}"):
                item = compact_text(item[: -len(category)])
                break
        if item and item not in elements:
            elements.append(item)
    return elements


def split_comma_list(value: str) -> list[str]:
    value = compact_text(value)
    value = re.sub(r"\s+등$", "", value)
    parts = re.split(r"\s*,\s*", value)
    return [part for part in parts if part and len(part) > 1]


def extract_related(text: str | None, label: str) -> list[str]:
    if not text:
        return []
    if label == "관련 학과":
        pos = text.rfind("관련 학과")
        if pos < 0:
            return []
        start = pos + len("관련 학과")
        end = text.find("관련 직업", start)
        if end < 0:
            end = min(len(text), start + 500)
        raw = text[start:end]
    else:
        positions = [m.start() for m in re.finditer("관련 직업", text)]
        if not positions:
            return []
        start = positions[-1] + len("관련 직업")
        end_tokens = [
            "진로를 위한 과목 선택",
            "※",
            "공통 과목",
            "일반 선택",
            "진로 선택",
            "융합 선택",
            "무엇을 배울까요",
            "핵심 아이디어",
            "핵심아이디어",
        ]
        end_candidates = [
            pos
            for token in end_tokens
            if (pos := text.find(token, start)) > start
        ]
        end = min(end_candidates) if end_candidates else min(len(text), start + 500)
        raw = text[start:end]

    if not raw:
        return []
    raw = re.sub(r"진로를 위한 과목 선택(?:\s*예시)?", "", raw)
    raw = re.sub(r"\s+(일반|진로|융합|공통)\s*선택.*$", "", raw)
    return split_comma_list(raw)


def selection_key(category: str) -> str | None:
    if "공통" in category:
        return "common"
    if "일반" in category:
        return "general"
    if "진로" in category:
        return "career"
    if "융합" in category:
        return "convergence"
    return None


def find_catalog_subjects(segment: str, catalog: dict[str, dict[str, str]]) -> list[dict[str, str]]:
    matches: list[tuple[int, int, dict[str, str]]] = []
    for entry in catalog.values():
        name = entry["name"]
        if len(name) < 2:
            continue
        for match in re.finditer(re.escape(name), segment):
            matches.append((match.start(), match.end(), entry))

    matches.sort(key=lambda item: (item[0], -(item[1] - item[0])))
    accepted: list[tuple[int, int, dict[str, str]]] = []
    occupied: list[tuple[int, int]] = []
    for start, end, entry in matches:
        if any(not (end <= used_start or start >= used_end) for used_start, used_end in occupied):
            continue
        accepted.append((start, end, entry))
        occupied.append((start, end))
    accepted.sort(key=lambda item: item[0])
    return [entry for _, _, entry in accepted]


def extract_course_selection_example(
    text: str | None, catalog: dict[str, dict[str, str]]
) -> dict[str, Any] | None:
    if not text:
        return None
    tail_start = max(text.rfind("진로를 위한 과목 선택 예시"), text.rfind("관련 직업"))
    tail = text[tail_start:] if tail_start >= 0 else text
    title_match = re.search(
        r"([가-힣A-Za-z0-9·/\s]+?(?:영역의 선택 과목|과 연계된 과목 선택))",
        tail,
    )
    if title_match:
        title = compact_text(title_match.group(1))
        title = re.sub(r"^.*등\s+", "", title).strip()
        segment = tail[title_match.start() :]
    else:
        # Some pages flatten the green box without its visual title. Keep only the
        # part after career text so department/career names do not become subjects.
        segment = tail.rsplit(" 등 ", 1)[-1] if " 등 " in tail else tail
        if not any(label in segment for label in ["공통 과목", "일반 선택", "진로 선택", "융합 선택"]):
            return None
        title = "진로를 위한 과목 선택 예시"
    result: dict[str, Any] = {
        "title": title,
        "common": [],
        "general": [],
        "career": [],
        "convergence": [],
    }
    seen_by_key = {key: set() for key in ["common", "general", "career", "convergence"]}

    for entry in find_catalog_subjects(segment, catalog):
        key = selection_key(entry["category"])
        if key is None:
            continue
        name = entry["name"]
        if name in seen_by_key[key]:
            continue
        seen_by_key[key].add(name)
        result[key].append(name)

    if not any(result[key] for key in ["common", "general", "career", "convergence"]):
        return None
    return result


def build_subject_record(
    name: str,
    offerings: list[dict[str, Any]],
    pages: list[str],
    page_tables: dict[int, list[list[list[str]]]],
    catalog: dict[str, dict[str, str]],
    pdf_name: str,
) -> dict[str, Any]:
    pdf_page, text = find_subject_page(name, pages)
    guide_page = pdf_page - 8 if pdf_page else None
    matched = text is not None
    content_categories = extract_content_categories(page_tables.get(pdf_page or -1))

    return {
        "id": slugify_korean(name),
        "name": name,
        "sourceStatus": "matched" if matched else "not_found_in_pdf",
        "source": {
            "type": "pdf" if matched else None,
            "file": pdf_name if matched else None,
            "pdfPage": pdf_page,
            "guidePage": guide_page,
        },
        "area": guide_area(guide_page),
        "category": extract_category(name, text),
        "credits": extract_credit_info(text),
        "assessment": extract_assessment(text),
        "description": extract_description(name, text),
        "keyIdeas": extract_key_ideas(text),
        "contentCategories": content_categories,
        "contentElements": extract_content_elements(text, content_categories),
        "relatedDepartments": extract_related(text, "관련 학과"),
        "relatedCareers": extract_related(text, "관련 직업"),
        "courseSelectionExample": extract_course_selection_example(text, catalog),
        "offerings": offerings,
    }


def apply_supplement(record: dict[str, Any]) -> dict[str, Any]:
    supplement = SUPPLEMENTAL_SUBJECTS.get(record["name"])
    if not supplement or record["sourceStatus"] == "matched":
        return record

    updated = {**record, **supplement}
    updated["offerings"] = record["offerings"]
    return updated


def main() -> None:
    subjects, offerings = extract_school_subjects()
    pdf_path = find_pdf()
    pages = get_pdf_pages(pdf_path)
    page_tables = get_pdf_tables(pdf_path)
    catalog = build_subject_catalog(pages)

    records = [
        apply_supplement(
            build_subject_record(name, offerings[name], pages, page_tables, catalog, pdf_path.name)
        )
        for name in subjects
    ]
    matched = [record for record in records if record["sourceStatus"] == "matched"]
    supplemented = [
        record for record in records if record["sourceStatus"].startswith("supplemented")
    ]
    unresolved = [
        record["name"]
        for record in records
        if record["sourceStatus"] not in {"matched", "supplemented", "supplemented_partial"}
    ]

    payload = {
        "metadata": {
            "generatedAt": date.today().isoformat(),
            "schoolSource": str(SCHOOL_JSON.relative_to(ROOT)).replace("\\", "/"),
            "pdfSource": pdf_path.name,
            "scope": "school_selection_options",
            "subjectCount": len(records),
            "matchedCount": len(matched),
            "supplementedCount": len(supplemented),
            "unresolvedCount": len(unresolved),
            "unresolvedSubjects": unresolved,
            "partialSupplementSubjects": [
                record["name"]
                for record in records
                if record["sourceStatus"] == "supplemented_partial"
            ],
        },
        "subjects": records,
    }

    for path in (OUT_DATA, OUT_APP):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    print(
        json.dumps(
            {
                "subjectCount": len(records),
                "matchedCount": len(matched),
                "supplementedCount": len(supplemented),
                "unresolvedCount": len(unresolved),
                "unresolvedSubjects": unresolved,
                "outputs": [
                    str(OUT_DATA.relative_to(ROOT)).replace("\\", "/"),
                    str(OUT_APP.relative_to(ROOT)).replace("\\", "/"),
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
