import { NextResponse } from 'next/server';
import openApiSpec from '@/lib/openapiSpec';

export async function GET() {
  return NextResponse.json(openApiSpec);
}