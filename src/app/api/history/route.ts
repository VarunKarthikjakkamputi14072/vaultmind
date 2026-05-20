import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    const { prisma } = await import('../../../lib/prisma');
    const history = await prisma.transaction.findMany({
      where: {
        wallet: { address: { equals: address, mode: 'insensitive' } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({ transactions: history });
  } catch (error) {
    console.error('[API Error] fetching transaction history:', error);
    return NextResponse.json({ error: 'Failed to fetch transaction history' }, { status: 500 });
  }
}
