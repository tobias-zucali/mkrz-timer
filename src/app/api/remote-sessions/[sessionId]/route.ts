import { NextResponse } from "next/server"

import {
  claimSession,
  getSession,
  heartbeatSession,
} from "@/server/remoteSessionDirectory"
import { SessionDirectoryError } from "@/utils/remoteSession/types"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params
    const session = getSession(sessionId)
    return NextResponse.json(session)
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params
    const body = (await request.json()) as
      | {
          action: "claim"
          expectedEpoch: number
          ownerClientId: string
          ownerPeerId: string
          peers: Array<{
            canControl: boolean
            clientId: string
            peerId: string
          }>
        }
      | {
          action: "heartbeat"
          epoch: number
          ownerClientId: string
          ownerPeerId: string
          peers?: Array<{
            canControl: boolean
            clientId: string
            peerId: string
          }>
        }

    const session =
      body.action === "claim"
        ? claimSession({
            expectedEpoch: body.expectedEpoch,
            ownerClientId: body.ownerClientId,
            ownerPeerId: body.ownerPeerId,
            peers: body.peers,
            sessionId,
          })
        : heartbeatSession({
            epoch: body.epoch,
            ownerClientId: body.ownerClientId,
            ownerPeerId: body.ownerPeerId,
            peers: body.peers,
            sessionId,
          })

    return NextResponse.json(session)
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
