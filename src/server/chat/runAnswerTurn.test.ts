import { describe, expect, test } from "bun:test"
import type {
  AnswerGenerator,
  AnswerObject,
  EvidencePack,
} from "src/server/chat/runAnswerTurn"
import { runAnswerTurn } from "src/server/chat/runAnswerTurn"

function fakeGenerator(answer: AnswerObject): AnswerGenerator {
  return {
    stream() {
      return {
        partials: (async function* () {
          yield answer
        })(),
        output: Promise.resolve(answer),
      }
    },
    generateOnce() {
      return Promise.resolve(answer)
    },
  }
}

const evidencePack = {
  evidence: [
    {
      chunkId: "chunk-1",
      sourceId: "source-1",
      text: "Pine resin seals wounds on the trunk.",
      startOffset: 0,
      endOffset: 40,
      ordinal: 0,
    },
  ],
  insufficient: false,
  mode: "factual",
  evidenceKind: "chunks",
} satisfies EvidencePack

describe("runAnswerTurn", () => {
  test("builds cited markdown and citation catalog from a grounded answer", async () => {
    const texts: string[] = []
    const turn = await runAnswerTurn({
      evidencePack,
      sourceIds: ["source-1"],
      sourcesById: new Map([
        ["source-1", { title: "Forest notes", deletedAt: null }],
      ]),
      sourceTitleById: new Map([["source-1", "Forest notes"]]),
      history: [],
      prompt: "What seals wounds?",
      generateAnswer: fakeGenerator({
        insufficient: false,
        paragraphs: [
          {
            text: "Resin seals wounds.",
            citations: [
              {
                chunkId: "chunk-1",
                quote: "Pine resin seals wounds on the trunk.",
              },
            ],
          },
        ],
      }),
      onPartial: {
        text: (text) => {
          texts.push(text)
        },
      },
    })

    expect(turn.status).toBe("complete")
    expect(turn.insufficient).toBe(false)
    expect(turn.content).toBe("Resin seals wounds. [[cite:1]]")
    expect(turn.citations).toMatchInlineSnapshot(`
      [
        {
          "chunkId": "chunk-1",
          "excerpt": "Pine resin seals wounds on the trunk.",
          "locator": {
            "endOffset": 37,
            "ordinal": 0,
            "startOffset": 0,
          },
          "order": 0,
          "sourceId": "source-1",
          "sourceTitleSnapshot": "Forest notes",
        },
      ]
    `)
    expect(texts.at(-1)).toBe(turn.content)
  })

  test("returns insufficient answers without citations", async () => {
    const turn = await runAnswerTurn({
      evidencePack,
      sourceIds: ["source-1"],
      sourcesById: new Map([
        ["source-1", { title: "Forest notes", deletedAt: null }],
      ]),
      sourceTitleById: new Map([["source-1", "Forest notes"]]),
      history: [],
      prompt: "What about Mars?",
      generateAnswer: fakeGenerator({
        insufficient: true,
        paragraphs: [
          {
            text: "The sources do not say.",
            citations: [],
          },
        ],
      }),
    })

    expect(turn).toMatchInlineSnapshot(`
      {
        "citations": [],
        "content": "The sources do not say.",
        "insufficient": true,
        "status": "complete",
      }
    `)
  })
})
