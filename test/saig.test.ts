import { GameEvent } from "../src/events.ts";
import { parseEvent } from "../src/saig.ts";
import {
  assertObjectMatch,
} from "https://deno.land/std@0.194.0/testing/asserts.ts";

Deno.test("it should parse events", () => {
  const event1 = parseEvent(
    `infoloc|9663043081200|648435392|(Context location: Breezehome, Herika can see this buildings to go:exit door to Whiterun,, Current Date in Skyrim World: Morndas, 8:14 PM, 20th of Frostfall, 4E 201)`,
  );
  assertObjectMatch(
    event1,
    {
      kind: "infoloc",
      timestamp: 9663.043081200,
      gameTimestamp: 648435392,
      context: {
        location: "Breezehome",
        date: "Morndas, 8:14 PM, 20th of Frostfall, 4E 201",
        pois: ["exit door to Whiterun"],
        npcs: undefined,
      },
    } as GameEvent,
  );

  const event2 = parseEvent(
    `infonpc|9663043141600|648435392|(Herika can see this beings in range:Serana,Sceolang,Herika,)`,
  );
  assertObjectMatch(
    event2,
    {
      kind: "infonpc",
      timestamp: 9663.043141600,
      gameTimestamp: 648435392,
      context: {
        location: undefined,
        date: undefined,
        pois: undefined,
        npcs: ["Serana", "Sceolang", "Herika"],
      },
    } as GameEvent,
  );
});
