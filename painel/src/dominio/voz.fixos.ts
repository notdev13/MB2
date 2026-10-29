import * as CORPUS from './voz.corpus';
import * as R1 from './voz.rodadas';
import * as R2 from './voz.rodadas2';
import * as R3 from './voz.rodadas3';
import * as R4 from './voz.rodadas4';
import * as R5 from './voz.rodadas5';
import * as R6 from './voz.rodadas6';
import * as R7 from './voz.rodadas7';
import * as R8 from './voz.rodadas8';
import * as R9 from './voz.rodadas9';
import * as R10 from './voz.rodadas10';
import * as R11 from './voz.rodadas11';
import * as R12 from './voz.rodadas12';
import * as R13 from './voz.rodadas13';
import * as R14 from './voz.rodadas14';
import * as R15 from './voz.rodadas15';
import * as R16 from './voz.rodadas16';
import * as R17 from './voz.rodadas17';
import * as R18 from './voz.rodadas18';
import type { Caso } from './voz.corpus';

// Todos os conjuntos fixos de frases (treino), juntos: tudo que o corpus exporta como lista de casos.
export const TODOS_FIXOS: Caso[] = [CORPUS, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15, R16, R17, R18]
  .flatMap((m) => Object.values(m))
  .filter((v): v is Caso[] => Array.isArray(v) && v.length > 0 && typeof (v[0] as Caso).frase === 'string')
  .flat();
