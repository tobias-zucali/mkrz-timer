import { NextResponse } from "next/server"

import { createSession } from "@/server/remoteSessionDirectory"
import { SessionDirectoryError } from "@/utils/remoteSession/types"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      ownerClientId: string
      ownerPeerId: string
      sessionId: string
    }
    const session = createSession(body)
    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    if (error instanceof SessionDirectoryError) {
      return NextResponse.json(
        {
          code: error.code,
          currentSession: error.currentSession,
          message: error.message,
        },
        { status: error.code === "not_found" ? 404 : 409 },
      )
    }

    return NextResponse.json(
      { message: "Unexpected remote session error" },
      { status: 500 },
    )
  }
}
