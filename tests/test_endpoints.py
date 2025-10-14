import os
import time
import unittest
import requests
from urllib.parse import urlencode

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000")

import json
import time
import requests

def as_int(v):
    return int(float(v)) if isinstance(v, str) else int(v)

def as_float(v):
    return float(v)

class TestDataSeeder:
    @staticmethod
    def create_question(subject, tags, correct="A", alts=None):
        if alts is None:
            alts = ["A", "B", "C", "D"]
        url = f"{BASE_URL}/api/questions"
        data = {
            "question": f"Pregunta {subject} / {','.join(tags)}",
            "alternatives": json.dumps(alts),  # JSON válido (comillas dobles)
            "correct_answer": correct,
            "subject": subject,
            "tags": ",".join(tags),
        }
        # Archivo dummy para gatillar multer.single("image")
        files = {"image": ("dummy.png", b"\x89PNG\r\n\x1a\n", "image/png")}
        r = requests.post(url, data=data, files=files)
        if r.status_code >= 400:
            raise requests.HTTPError(f"{r.status_code} {r.reason} – body: {r.text}", response=r)
        return r.json()["question"]["id"]

    @staticmethod
    def submit_essay_with_details(student_email, subject, details):
        """
        details: [{question_id, chosen_answer, correct_answer, tags:[...]}]
        Inserta en results y results_detail (NO en student_exams).
        """
        url = f"{BASE_URL}/api/submit-essay"
        payload = {
            "student_email": student_email,
            "subject": subject,
            "correct": sum(1 for d in details if d["chosen_answer"] == d["correct_answer"]),
            "total": len(details),
            "details": details
        }
        r = requests.post(url, json=payload)
        if r.status_code >= 400:
            raise requests.HTTPError(f"{r.status_code} {r.reason} – body: {r.text}", response=r)
        return r.json()

    @staticmethod
    def add_exam(student_email, subject, score):
        """Inserta directamente un registro en student_exams (para la serie temporal)."""
        url = f"{BASE_URL}/api/exams"
        payload = {"student_email": student_email, "subject": subject, "score": score}
        r = requests.post(url, json=payload)
        if r.status_code >= 400:
            raise requests.HTTPError(f"{r.status_code} {r.reason} – body: {r.text}", response=r)
        return r.json()

class TestTagStatsEndpoint(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.student = "test.alumno@example.com"
        cls.subject_ok = "matematica"

        # Preguntas (para respetar FK en results_detail)
        cls.q1 = TestDataSeeder.create_question(subject=cls.subject_ok, tags=["algebra"])
        cls.q2 = TestDataSeeder.create_question(subject=cls.subject_ok, tags=["geometria"])

        # Ensayo: acierta algebra (A==A) y falla geometria (B!=A)
        TestDataSeeder.submit_essay_with_details(
            student_email=cls.student,
            subject=cls.subject_ok,
            details=[
                {"question_id": cls.q1, "chosen_answer": "A", "correct_answer": "A", "tags": ["algebra"]},
                {"question_id": cls.q2, "chosen_answer": "B", "correct_answer": "A", "tags": ["geometria"]},
            ]
        )
        time.sleep(0.2)

    @classmethod
    def tearDownClass(cls):
        requests.delete(f"{BASE_URL}/api/questions/{cls.q1}")
        requests.delete(f"{BASE_URL}/api/questions/{cls.q2}")

    def test_E1_1_tag_stats_with_subject_filter(self):
        from urllib.parse import urlencode

        params = urlencode({"subject": self.subject_ok})
        url = f"{BASE_URL}/api/tag-stats/{self.student}?{params}"
        r = requests.get(url)
        self.assertEqual(r.status_code, 200)
        data = r.json()

        # Mapeamos por nombre de etiqueta
        tags = {row["tag"]: row for row in data}

        # Existen ambas etiquetas
        self.assertIn("algebra", tags)
        self.assertIn("geometria", tags)

        #  Casteamos porque el backend puede devolver strings ("1") en lugar de enteros
        self.assertEqual(as_int(tags["algebra"]["correct"]), 1)
        self.assertEqual(as_int(tags["algebra"]["wrong"]), 0)
        self.assertEqual(as_int(tags["algebra"]["total"]), 1)
        self.assertTrue(99.0 <= as_float(tags["algebra"]["accuracy"]) <= 100.0)

        self.assertEqual(as_int(tags["geometria"]["correct"]), 0)
        self.assertEqual(as_int(tags["geometria"]["wrong"]), 1)
        self.assertEqual(as_int(tags["geometria"]["total"]), 1)
        self.assertTrue(0.0 <= as_float(tags["geometria"]["accuracy"]) <= 1.0)

    def test_E1_2_tag_stats_empty_for_other_subject(self):
        # Filtro a una materia sin datos para este alumno
        params = urlencode({"subject": "historia"})
        url = f"{BASE_URL}/api/tag-stats/{self.student}?{params}"
        r = requests.get(url)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), [])

class TestScoreTimeseriesEndpoint(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.student = "test.alumno@example.com"
        cls.subject_ok = "matematica"

        # Dos exámenes para la serie temporal
        TestDataSeeder.add_exam(student_email=cls.student, subject=cls.subject_ok, score=50)
        time.sleep(0.2)
        TestDataSeeder.add_exam(student_email=cls.student, subject=cls.subject_ok, score=80)
        time.sleep(0.2)

    @classmethod
    def tearDownClass(cls):
        # No hay endpoint para borrar student_exams: lo dejamos como histórico
        pass

    def test_E2_1_two_points_in_ascending_time(self):
        url = f"{BASE_URL}/api/score-timeseries/{self.student}"
        r = requests.get(url)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        # Debe existir al menos 2 registros totales para matematica
        math_points = [d for d in data if d["subject"] == self.subject_ok]
        self.assertGreaterEqual(len(math_points), 2)
        # Verificar orden ascendente por created_at
        created_list = [p["created_at"] for p in math_points]
        self.assertEqual(created_list, sorted(created_list))

    def test_E2_2_empty_for_unknown_student(self):
        url = f"{BASE_URL}/api/score-timeseries/no.data@example.com"
        r = requests.get(url)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), [])

if __name__ == "__main__":
    unittest.main(verbosity=2)
