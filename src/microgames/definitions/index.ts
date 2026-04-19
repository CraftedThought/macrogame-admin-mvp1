/* src/microgames/definitions/index.ts */

import { MicrogameDefinition } from '../../types/MicrogameDefinition';
import { avoidDefinition } from './avoid';
import { catchDefinition } from './catch';

export const MICROGAME_DEFINITIONS: { [key: string]: MicrogameDefinition } = {
    'Avoid': avoidDefinition,
    'Catch': catchDefinition
};