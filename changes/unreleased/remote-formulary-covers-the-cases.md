### Added

- **The learner remote can prepare every drug a shipped case asks for, and every drug the pump can run but two.**
  Twenty-six drugs gain a formulary entry read from one product label each (DailyMed): amiodarone, atropine,
  adenosine, naloxone, sugammadex and remifentanil, which the cases ask for, and the pump's infusions (ketamine,
  dexmedetomidine, sufentanil, vecuronium, cisatracurium, atracurium, norepinephrine, vasopressin, dobutamine,
  milrinone, dopamine, nitroglycerin, nitroprusside, esmolol, magnesium sulfate, regular insulin, dextrose 50 %,
  lidocaine, bupivacaine, ropivacaine). Each entry gives the label's products, strengths and listed diluents; it holds
  no compatibility or stability statement yet (`has.stabilis` and `has.trissel` false), so the bench finds no loss
  for it and says so. A new test reads every shipped card as the app shows it and fails when a card asks for a drug
  the remote cannot prepare and the host cannot give, and when the pump offers a drug the remote cannot prepare in a
  syringe the host can run. Mivacurium (no open label found) and potassium chloride (the labels read name no diluent,
  and the host takes no syringe in mmol) are listed in the test as wanted.
