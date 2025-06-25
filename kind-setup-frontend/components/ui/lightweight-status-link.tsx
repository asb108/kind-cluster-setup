'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

export function LightweightStatusLink() {
  return (
    <Link href="/lightweight-status">
      <Button 
        variant="outline" 
        size="sm" 
        className="text-amber-500 hover:text-amber-600 border-amber-300 hover:border-amber-500"
      >
        <Zap className="w-4 h-4 mr-2" />
        Quick Status View
      </Button>
    </Link>
  );
}
