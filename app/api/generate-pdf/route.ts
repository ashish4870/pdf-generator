import { type NextRequest, NextResponse } from "next/server"
import puppeteer from "puppeteer-core"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const keys = Object.keys(body)
    if (keys.length !== 1 || !keys.includes("url")) {
      const unexpectedProps = keys.filter((key) => key !== "url")
      return NextResponse.json({ error: `Unexpected property: ${unexpectedProps.join(", ")}` }, { status: 400 })
    }
    const { url } = body
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL must be a valid string" }, { status: 400 })
    }

    const browserlessToken = 'enter ur code API token plzz'
    if (!browserlessToken) {
      return NextResponse.json({ error: "Browserless token is not configured" }, { status: 500 })
    }

    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://production-sfo.browserless.io?token=${browserlessToken}`,
    })

    const page = await browser.newPage()

    await page.setViewport({ width: 1280, height: 800 })

    await page.goto(url, { waitUntil: "domcontentloaded" })

    await page.evaluate(async () => {
      const imgElements = Array.from(document.querySelectorAll("img"))

      const imgPromises = imgElements.map((img) => {
        if (img.complete || !img.src) {
          return Promise.resolve()
        }

        return new Promise((resolve) => {
          img.addEventListener("load", resolve)
          img.addEventListener("error", resolve) 
        })
      })

      await Promise.all(imgPromises)
      await new Promise((resolve) => setTimeout(resolve, 500))
    })


    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    })

    await browser.close()

    const response = new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="webpage.pdf"',
      },
    })

    return response
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
