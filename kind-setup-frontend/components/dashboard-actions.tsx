'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Plus, Settings, RefreshCw, Loader2 } from 'lucide-react';
import { AnimatedButton } from "@/components/ui/animated-button";

interface DashboardActionsProps {
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function DashboardActions({ isRefreshing, onRefresh }: DashboardActionsProps) {
  return (
    <div className="flex items-center mt-4 md:mt-0 gap-2 flex-wrap">
      <Link href="/cluster-utility">
        <Button variant="outline" size="sm" className="mr-2">
          <Settings className="w-4 h-4 mr-2" />
          Cluster Utility
        </Button>
      </Link>

      <Button
        variant="secondary"
        size="sm"
        disabled={isRefreshing}
        onClick={onRefresh}
        className="mr-2"
      >
        {isRefreshing ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Refreshing</>
        ) : (
          <><RefreshCw className="w-4 h-4 mr-2" /> Quick Refresh</>
        )}
      </Button>
      
      <Link href="/create-cluster">
        <AnimatedButton
          icon={<Plus className="w-4 h-4" />}
          size="lg"
        >
          Create Cluster
        </AnimatedButton>
      </Link>
    </div>
  );
}
