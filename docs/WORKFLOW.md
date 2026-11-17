# Classroom Workflow

How the simulator is used end to end, from learning to evaluation on the physical mat.
Decisions: [0001](decisions/0001-self-directed-progression-no-locks.md),
[0008](decisions/0008-evaluation-on-physical-robot.md),
[0012](decisions/0012-teacher-owns-guidance-and-sim-to-real.md).

> Status legend: ✅ exists today · 🛠 planned (see [ROADMAP](ROADMAP.md)).

---

## 1. Learning (student, own pace)

1. 🛠 Open the sim → level screen. Worlds in suggested order, **nothing locked**. Each
   level shows its objective, assumed concepts, and ★ status.
2. Build → run → adjust. Aids: 🛠 running-block highlight, 🛠 live sensor panel, 🛠 path
   trail. No in-app hints: the teacher guides in class.
3. Feedback: 🛠 ★ worked on this run · ★★ works on every variant · ★★★ optional challenge.
4. 🛠 Progress saved in the browser. On shared computers: export/import a progress file.
5. With robots in class: 🛠 **Exportar para Open Roberta** on any level, import in OR Lab,
   try it on the real robot.

## 2. Preparing for evaluation (student)

6. 🛠 Pick an evaluation level: 3 standard (max 4/5) or advanced (5/5). Same map and
   variants as the physical mat.
7. Practise to ★★ in the sim, then test on the real robot in class.
8. 🛠 **Exportar para Open Roberta** → asks for name → downloads `Nome_<levelId>.xml`
   (Open Roberta format, mBot 2 configuration included).
9. Send the file via Teams/Moodle.

## 3. Before evaluation day (teacher, once)

10. Build the chosen evaluation maps by hand from the level's preview
    (`levels/_previews/<id>.png`, sizes in the YAML): coloured cardboard for zones and
    patches, black tape for lines, boxes for walls and obstacles.
11. 🛠 Teacher sheet per level: setup, variant marks, explanation questions, rubric.

## 4. Evaluation day (teacher, per student)

12. Sort files by level (the filename does it), so each map is set up once.
13. Open Roberta Lab (mBot 2) → *Importar programa* → transfer to the robot as usual.
14. Robot on the start mark, set a variant (e.g. box on mark 3), run. Retries allowed
    at the teacher's discretion.
15. Student explains the implementation; grade with the rubric.

## Later

- Send programs straight to the robot through the Open Roberta Lab Windows app, to
  skip the import/transfer step on evaluation day.
