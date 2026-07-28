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
  evidenceBlock:
    "[1] chunk:chunk-1 source:source-1\nPine resin seals wounds on the trunk.",
  systemAddendum: "",
  useDigestEvidence: false,
} satisfies EvidencePack

describe("runAnswerTurn", () => {
  test("builds cited markdown and citation catalog from a grounded answer", async () => {
    const texts: string[] = []
    const turn = await runAnswerTurn({
      evidencePack,
      sourcesById: new Map([
        ["source-1", { title: "Forest notes", deletedAt: null }],
      ]),
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

  test("retries corpus source omissions and rejects persistent ones", async () => {
    const corpusEvidencePack = {
      evidence: [
        {
          chunkId: "chunk-1",
          sourceId: "source-1",
          text: "Pine resin seals wounds on the trunk.",
          startOffset: 0,
          endOffset: 40,
          ordinal: 0,
        },
        {
          chunkId: "chunk-2",
          sourceId: "source-2",
          text: "Oak bark protects the living tissue underneath.",
          startOffset: 0,
          endOffset: 48,
          ordinal: 0,
        },
      ],
      insufficient: false,
      mode: "corpus",
      evidenceKind: "coverage",
      evidenceBlock: "Evidence from both sources.",
      systemAddendum: "Cover every source.",
      useDigestEvidence: false,
    } satisfies EvidencePack
    const incompleteAnswer = {
      insufficient: false,
      paragraphs: [
        {
          text: "Pine resin seals wounds.",
          citations: [
            {
              chunkId: "chunk-1",
              quote: "Pine resin seals wounds on the trunk.",
            },
          ],
        },
      ],
    } satisfies AnswerObject
    const completeAnswer = {
      insufficient: false,
      paragraphs: [
        ...incompleteAnswer.paragraphs,
        {
          text: "Oak bark protects living tissue.",
          citations: [
            {
              chunkId: "chunk-2",
              quote: "Oak bark protects the living tissue underneath.",
            },
          ],
        },
      ],
    } satisfies AnswerObject
    let retries = 0

    const turn = await runAnswerTurn({
      evidencePack: corpusEvidencePack,
      sourcesById: new Map([
        ["source-1", { title: "Pine notes" }],
        ["source-2", { title: "Oak notes" }],
      ]),
      history: [],
      prompt: "Brief both sources.",
      generateAnswer: {
        stream() {
          return {
            partials: (async function* () {
              yield incompleteAnswer
            })(),
            output: Promise.resolve(incompleteAnswer),
          }
        },
        generateOnce() {
          retries += 1

          return Promise.resolve(completeAnswer)
        },
      },
    })

    expect({
      retries,
      status: turn.status,
      citedSourceIds: turn.citations.map((citation) => citation.sourceId),
    }).toMatchInlineSnapshot(`
      {
        "citedSourceIds": [
          "source-1",
          "source-2",
        ],
        "retries": 1,
        "status": "complete",
      }
    `)

    const failedTurn = await runAnswerTurn({
      evidencePack: corpusEvidencePack,
      sourcesById: new Map([
        ["source-1", { title: "Pine notes" }],
        ["source-2", { title: "Oak notes" }],
      ]),
      history: [],
      prompt: "Brief both sources.",
      generateAnswer: fakeGenerator(incompleteAnswer),
    })

    expect({
      status: failedTurn.status,
      citations: failedTurn.citations,
      errorMessage: failedTurn.errorMessage,
    }).toMatchInlineSnapshot(`
      {
        "citations": [],
        "errorMessage": "The answer didn't cover every selected source. Try again.",
        "status": "failed",
      }
    `)
  })

  test("returns insufficient answers without citations", async () => {
    const turn = await runAnswerTurn({
      evidencePack,
      sourcesById: new Map([
        ["source-1", { title: "Forest notes", deletedAt: null }],
      ]),
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
