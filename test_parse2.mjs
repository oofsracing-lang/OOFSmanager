import { parseRaceXml } from './src/utils/raceParser.js';
import fs from 'fs';

const xml = `<?xml version="1.0" encoding="utf-8"?>
<rFactorXML version="1.0">
  <RaceResults>
    <Driver>
      <Name>Julian Munoz</Name>
      <CarClass>Hyper</CarClass>
    </Driver>
  </RaceResults>
</rFactorXML>`;

console.log(JSON.stringify(parseRaceXml(xml), null, 2));
