import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // @ts-ignore
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    // @ts-ignore
    oauth2Client.setCredentials({ access_token: session.accessToken });

    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client
    });
    
    const response = await youtube.subscriptions.list({
      part: ["snippet", "contentDetails"],
      mine: true,
      maxResults: 50,
    });

    return NextResponse.json({ channels: response.data.items });
    
  } catch (error) {
    console.error("YouTube API Error:", error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}
