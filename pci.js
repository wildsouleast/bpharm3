(function (root) {
  "use strict";
  // ---------- SHA-256 (pure JS; works on http too) ----------
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var maxWord = Math.pow(2, 32), result = "", words = [], len = ascii.length * 8, i, j;
    var hash = [], k = [], primeCounter = 0, isComposite = {};
    for (var cand = 2; primeCounter < 64; cand++) {
      if (!isComposite[cand]) {
        for (i = 0; i < 313; i += cand) isComposite[i] = cand;
        hash[primeCounter] = (Math.pow(cand, .5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(cand, 1 / 3) * maxWord) | 0;
      }
    }
    hash = hash.slice(0, 8);
    ascii += "\x80";
    while (ascii.length % 64 - 56) ascii += "\x00";
    for (i = 0; i < ascii.length; i++) { j = ascii.charCodeAt(i); if (j >> 8) return ""; words[i >> 2] |= j << ((3 - i) % 4) * 8; }
    words[words.length] = ((len / maxWord) | 0); words[words.length] = len;
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash); hash[4] = (hash[4] + t1) | 0; hash.length = 8;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : "") + b.toString(16); }
    return result;
  }

  // ---------- unlock codes ----------
  var SALT = "pci3sem:";
  function normCode(s) {
    s = String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (s.indexOf("PCI") === 0) s = s.slice(3);
    return s ? "PCI-" + s : "";
  }
  function codeHash(code) { return sha256(SALT + normCode(code)); }
  function isValidCode(code, hashes) { var c = normCode(code); return !!c && (hashes || []).indexOf(codeHash(c)) !== -1; }

  // ---------- syllabus split into two study parts per unit ----------
  var SYL = {"bp301t": {"1": {"n": "Benzene and its derivatives", "p": ["Analytical, synthetic and other evidences for the structure of benzene; orbital picture; resonance; aromatic character and Hückel's rule; Reactions of benzene: nitration, sulphonation, halogenation, Friedel–Crafts alkylation (limitations) and acylation", "Effect of substituents on reactivity and orientation in electrophilic substitution; Structure and uses of DDT, saccharin, BHC and chloramine"]}, "2": {"n": "Phenols, aromatic amines and aromatic acids", "p": ["Phenols: acidity, effect of substituents on acidity, qualitative tests; structure and uses of phenol, cresols, resorcinol, naphthols; Aromatic amines: basicity, effect of substituents on basicity, synthetic uses of aryl diazonium salts", "Aromatic acids: acidity, effect of substituents, important reactions of benzoic acid"]}, "3": {"n": "Fats and oils", "p": ["Fatty acids and their reactions; hydrolysis, hydrogenation, saponification, rancidity of oils, drying oils", "Analytical constants: acid value, saponification value, ester value, iodine value, acetyl value, Reichert–Meissl (RM) value: significance and principle of determination"]}, "4": {"n": "Polynuclear hydrocarbons", "p": ["Synthesis and reactions", "structure and medicinal uses of naphthalene, phenanthrene, anthracene, diphenylmethane, triphenylmethane and their derivatives"]}, "5": {"n": "Cycloalkanes", "p": ["Stabilities: Baeyer's strain theory and its limitations, Coulson and Moffitt's modification, Sachse–Mohr theory (strainless rings)", "Reactions of cyclopropane and cyclobutane only"]}}, "bp302t": {"1": {"n": "Solubility of drugs", "p": ["Solubility expressions, solute–solvent interactions, ideal solubility parameters, solvation and association, factors influencing solubility, diffusion in biological systems; Solubility of gases in liquids and of liquids in liquids", "Raoult's law, ideal and real solutions; partially miscible liquids, critical solution temperature; distribution law, its limitations and applications"]}, "2": {"n": "States of matter & physicochemical properties", "p": ["Changes in state, latent heat, vapour pressure, sublimation, critical point, eutectic mixtures, gases, aerosols (inhalers), relative humidity, liquid crystals, glassy state, crystalline and amorphous solids, polymorphism", "Refractive index, optical rotation, dielectric constant, dipole moment, dissociation constant: determination and applications"]}, "3": {"n": "Surface and interfacial phenomenon", "p": ["Liquid interfaces; surface and interfacial tension; surface free energy and its measurement; spreading coefficient; adsorption at liquid interfaces", "surface active agents; HLB scale; solubilisation; detergency; adsorption at solid interfaces"]}, "4": {"n": "Complexation and protein binding", "p": ["Classification of complexes; applications; methods of analysis; protein binding; complexation and drug action", "crystalline structure of complexes; thermodynamic treatment of stability constants"]}, "5": {"n": "pH, buffers and isotonic solutions", "p": ["Sorensen's pH scale; pH determination (electrometric and colorimetric); buffer equation; buffer capacity; applications of buffers", "buffers in pharmaceutical and biological systems; buffered isotonic solutions"]}}, "bp303t": {"1": {"n": "Introduction, bacteria, culture and microscopy", "p": ["History, branches and scope of microbiology; prokaryotes vs eukaryotes; ultrastructure and morphological classification of bacteria; nutritional needs, culture media and growth conditions", "growth curve; isolation and preservation of pure cultures; cultivation of anaerobes; total and viable counts; Phase contrast, dark field and electron microscopy"]}, "2": {"n": "Staining, IMViC and sterilization", "p": ["Simple, Gram's and acid-fast staining; IMViC tests; Physical, chemical and mechanical sterilization: principle, procedure, merits, demerits, applications", "Evaluating sterilization efficiency, large-scale sterilization equipment, sterility indicators"]}, "3": {"n": "Fungi, viruses, disinfectants and sterility testing", "p": ["Morphology, classification, reproduction/replication and cultivation of fungi and viruses; Classification and mode of action of disinfectants; factors influencing disinfection", "evaluation of antiseptics (bactericidal and bacteriostatic); Sterility testing of products as per IP, BP and USP"]}, "4": {"n": "Aseptic area and microbiological assay", "p": ["Design of an aseptic area, laminar air flow, sources of contamination and their prevention, clean area classification; Principles and methods of microbiological assay", "standardization of antibiotics, vitamins and amino acids; assessment of a new antibiotic"]}, "5": {"n": "Spoilage, preservation and cell culture", "p": ["Types of spoilage, factors affecting microbial spoilage, sources and types of contaminants, assessment of spoilage; Preservation with antimicrobial agents and evaluation of microbial stability", "Animal cell culture: general procedure, primary, established and transformed cell lines, applications in industry and research"]}}, "bp304t": {"1": {"n": "Flow of fluids, size reduction and size separation", "p": ["Manometers, Reynolds number, Bernoulli's theorem, energy losses; orifice meter, venturimeter, pitot tube, rotameter; Size reduction: laws, factors; hammer mill, ball mill, fluid energy mill, edge runner and end runner mill", "Size separation: official grades of powders, standard sieves; sieve shaker, cyclone separator, air separator, bag filter, elutriation tank"]}, "2": {"n": "Heat transfer, evaporation and distillation", "p": ["Mechanisms of heat transfer, Fourier's law, conduction, convection, radiation, heat exchangers and interchangers; Evaporation: factors; steam jacketed kettle, horizontal tube, climbing film, forced circulation and multiple effect evaporators (economy)", "Distillation: simple, flash, fractional, reduced pressure, steam and molecular distillation"]}, "3": {"n": "Drying and mixing", "p": ["Drying: mechanism, equilibrium moisture content, rate of drying curve; tray, drum, spray, fluidized bed, vacuum and freeze dryers; Mixing: factors, solid vs liquid mixing, mechanisms", "double cone, twin shell and ribbon blenders, sigma blade and planetary mixers, propellers, turbines, paddles, Silverson emulsifier"]}, "4": {"n": "Filtration and centrifugation", "p": ["Filtration: theories, factors, filter aids and media; plate and frame filter, filter leaf, rotary drum filter, meta filter, cartridge filter, membrane filter, Seitz filter", "Centrifugation: principle and applications; perforated and non-perforated basket, semi-continuous and super centrifuge"]}, "5": {"n": "Materials of plant construction, corrosion and material handling", "p": ["Factors in selecting materials for pharmaceutical plants; theories and types of corrosion and their prevention", "ferrous and non-ferrous metals, inorganic and organic non-metals; basics of material handling systems"]}}};
  var PAIRS = [["bp301t", "bp303t"], ["bp302t", "bp304t"]];
  var SHORT = { bp301t: "Org Chem II", bp302t: "Phys Pharm I", bp303t: "Microbiology", bp304t: "Pharm Engg" };

  function dayN(key) { return Math.floor(Date.parse(key + "T00:00:00Z") / 86400000); }
  function keyOf(n) { return new Date(n * 86400000).toISOString().slice(0, 10); }

  // Build a plan from start (today) to the day before the exam, at most maxDays days.
  function buildPlan(startKey, examKey, maxDays) {
    maxDays = maxDays || 30;
    var gap = dayN(examKey) - dayN(startKey);
    if (!(gap >= 1)) return { error: "past" };
    var N = Math.min(maxDays, gap);
    var reserved = N >= 8 ? 2 : 1;                 // final revision + mock, or only mock
    var M = Math.max(0, N - reserved);
    var revs = Math.floor(M / 7), L = M - revs, extraRev = 0;
    // study sessions, each a [subject, unit, part]; part 0 = whole unit
    var units = [];
    for (var u = 1; u <= 5; u++) PAIRS.forEach(function (p) { units.push([p[0], u], [p[1], u]); });
    var chunks = [];
    if (L >= 20) {
      for (var u2 = 1; u2 <= 5; u2++) PAIRS.forEach(function (p) {
        [1, 2].forEach(function (part) { chunks.push([[p[0], u2, part], [p[1], u2, part]]); });
      });
      extraRev = L - 20; L = 20;
    } else if (L > 0) {
      for (var d = 0; d < L; d++) {
        var a = Math.floor(d * 20 / L), b = Math.floor((d + 1) * 20 / L);
        chunks.push(units.slice(a, b).map(function (x) { return [x[0], x[1], 0]; }));
      }
    }
    var days = [], sinceRev = [], learnt = [], every = revs ? Math.max(1, Math.round(L / (revs + 1))) : 0, revLeft = revs;
    chunks.forEach(function (c, i) {
      days.push({ type: "learn", sessions: c, quiz: c.map(function (s) { return [s[0], s[1]]; }) });
      c.forEach(function (s) { sinceRev.push([s[0], s[1]]); learnt.push([s[0], s[1]]); });
      if (revLeft > 0 && every && (i + 1) % every === 0 && i < chunks.length - 1) {
        days.push({ type: "revise", quiz: uniq(sinceRev) }); sinceRev = []; revLeft--;
      }
    });
    revLeft += extraRev;
    var rot = 0, SUBJ = ["bp301t", "bp302t", "bp303t", "bp304t"];
    while (revLeft-- > 0) {
      if (sinceRev.length) { days.push({ type: "revise", quiz: uniq(sinceRev) }); sinceRev = []; continue; }
      var sj = SUBJ[rot++ % 4];   // full revision of one subject (all 5 units)
      days.push({ type: "revise", subject: sj, quiz: [1, 2, 3, 4, 5].map(function (u) { return [sj, u]; }) });
    }
    if (reserved === 2) days.push({ type: "final", quiz: units.slice() });
    days.push({ type: "mock", quiz: units.slice() });
    var s0 = dayN(startKey);
    days.forEach(function (d, i) { d.n = i + 1; d.date = keyOf(s0 + i); });
    return { start: startKey, exam: examKey, total: days.length, gap: gap, days: days };
  }
  function uniq(list) { var seen = {}, out = []; list.forEach(function (x) { var k = x[0] + ":" + x[1]; if (!seen[k]) { seen[k] = 1; out.push(x); } }); return out; }

  root.PCI = { sha256: sha256, normCode: normCode, codeHash: codeHash, isValidCode: isValidCode, buildPlan: buildPlan, SYL: SYL, SHORT: SHORT, dayN: dayN, keyOf: keyOf };
})(typeof window !== "undefined" ? window : globalThis);
