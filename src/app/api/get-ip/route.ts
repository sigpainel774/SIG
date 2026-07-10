import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // Tratar cabeçalho x-forwarded-for para pegar apenas o primeiro IP (IP real do cliente)
  const forwardedFor = request.headers.get('x-forwarded-for')
  let ip = '127.0.0.1'
  
  if (forwardedFor) {
    ip = forwardedFor.split(',')[0].trim()
  } else {
    ip = (request as any).ip || '127.0.0.1'
  }
  
  return NextResponse.json({ ip })
}
