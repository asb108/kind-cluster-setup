'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { HardDrive, Cpu, Database, Server, X, AlertCircle, CheckCircle, Settings } from "lucide-react";
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { motion } from 'framer-motion';

interface ClusterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  clusterName: string;
  config: {
    worker_nodes: number;
    memory: string;
    cpu: number;
    _rawConfig?: any;
    _error?: string;
  } | null;
  isLoading: boolean;
}

export function ClusterConfigModal({
  isOpen,
  onClose,
  clusterName,
  config,
  isLoading
}: ClusterConfigModalProps) {
  // State to manage technical details visibility
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Reset technical details state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setShowTechnicalDetails(false);
    }
  }, [isOpen]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col bg-card border-border text-card-foreground shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-h3">
            <div className="p-2 rounded-md bg-primary/10">
              <Server className="h-5 w-5 text-primary" />
            </div>
            {clusterName} Configuration
          </DialogTitle>
          <DialogDescription>
            Detailed configuration for the {clusterName} Kind cluster.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mb-4"
            >
              <div className="p-3 rounded-full bg-primary/10">
                <Server className="h-8 w-8 text-primary" />
              </div>
            </motion.div>
            <p className="text-foreground font-medium text-black dark:text-white">Loading cluster configuration...</p>
            <p className="text-sm text-black/80 dark:text-white/80 mt-2">Retrieving data for {clusterName}</p>
          </div>
        ) : (
          <div className="py-6 overflow-y-auto flex-1">
            {/* Debug section - collapsible */}
            <div className="mb-4">
              <details className="text-xs">
                <summary className="cursor-pointer text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white inline-flex items-center gap-1">
                  <span className="text-xs font-medium">Debug Info</span>
                </summary>
                <div className="mt-2 p-3 rounded-md border border-border bg-white/70 dark:bg-gray-800/70">
                  <p className="text-black dark:text-white"><span className="font-medium">Cluster Name:</span> {clusterName}</p>
                  <p className="text-black dark:text-white"><span className="font-medium">Loading State:</span> {isLoading ? 'Loading...' : 'Completed'}</p>
                  <p className="text-black dark:text-white"><span className="font-medium">Config Object:</span> {config ? 'Available' : 'Null/Undefined'}</p>
                  {config && <p className="text-black dark:text-white"><span className="font-medium">Config Type:</span> {typeof config}</p>}
                </div>
              </details>
            </div>

            {config ? (
              <motion.div
                className="space-y-5"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div
                  className="p-4 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors"
                  variants={itemVariants}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-md bg-primary/10">
                      <Server className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-black dark:text-white">Worker Nodes</h4>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-black dark:text-white">{config.worker_nodes}</p>
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {config.worker_nodes > 1 ? 'Multi-node' : 'Single-node'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="p-4 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors"
                  variants={itemVariants}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-md bg-tertiary/10">
                      <Database className="h-6 w-6 text-tertiary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-black dark:text-white">Memory Allocation</h4>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-black dark:text-white">{config.memory}</p>
                        <span className="text-xs px-2 py-1 rounded-full bg-tertiary/10 text-tertiary">
                          {parseInt(config.memory) >= 8 ? 'High Memory' : 'Standard'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="p-4 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors"
                  variants={itemVariants}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-md bg-secondary/10">
                      <Cpu className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-black dark:text-white">CPU Allocation</h4>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-black dark:text-white">{config.cpu}</p>
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary/10 text-secondary">
                          {config.cpu >= 4 ? 'High Performance' : 'Standard'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="mt-6 p-4 rounded-lg border border-success/20 bg-success/5"
                  variants={itemVariants}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-success/10 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-success font-medium">Cluster is properly configured</p>
                      <p className="text-xs text-black/70 dark:text-white/70 mt-1">
                        This cluster has sufficient resources for most development workloads.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Debug Information */}
                <motion.div
                  className="mt-6 p-4 rounded-lg border border-border bg-muted/10"
                  variants={itemVariants}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-black dark:text-white">Configuration Details</h4>
                    <p className="text-xs text-black/70 dark:text-white/70">Retrieved from cluster</p>
                  </div>

                  <div className="mt-6">
                    {/* Toggleable debug section with proper animation */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                        className="text-xs text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white inline-flex items-center gap-1 mb-2"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        <span>{showTechnicalDetails ? "Hide Technical Details" : "View Technical Details"}</span>
                      </button>

                      <motion.div
                        initial={false}
                        animate={{
                          height: showTechnicalDetails ? "auto" : 0,
                          opacity: showTechnicalDetails ? 1 : 0,
                          marginTop: showTechnicalDetails ? 8 : 0,
                          marginBottom: showTechnicalDetails ? 8 : 0
                        }}
                        transition={{
                          height: { duration: 0.3, ease: "easeInOut" },
                          opacity: { duration: 0.2, ease: "easeInOut" }
                        }}
                        className="overflow-hidden"
                      >
                        <div className="w-full rounded-md border border-border p-3 bg-white/90 dark:bg-gray-800/90">
                          <div className="space-y-3">
                            <div>
                              <h5 className="text-xs font-medium mb-1 text-black dark:text-white">Formatted Config:</h5>
                              <div className="relative bg-gray-100 dark:bg-gray-900 rounded-md overflow-hidden">
                                <div className="p-2 text-xs overflow-auto max-h-[100px]">
                                  <code className="block whitespace-pre font-mono text-xs text-black dark:text-white">
                                    {JSON.stringify({
                                      worker_nodes: config.worker_nodes,
                                      memory: config.memory,
                                      cpu: config.cpu
                                    }, null, 2)}
                                  </code>
                                </div>
                              </div>
                            </div>

                            {config._rawConfig && (
                              <div>
                                <h5 className="text-xs font-medium mb-1 text-black dark:text-white">Raw Config:</h5>
                                <div className="relative bg-gray-100 dark:bg-gray-900 rounded-md overflow-hidden">
                                  <div className="p-2 text-xs overflow-auto max-h-[200px]">
                                    <code className="block whitespace-pre font-mono text-xs text-black dark:text-white">
                                      {JSON.stringify(config._rawConfig, null, 2)}
                                    </code>
                                  </div>
                                </div>
                              </div>
                            )}

                            {config._error && (
                              <div>
                                <h5 className="text-xs font-medium text-destructive mb-1">Error:</h5>
                                <div className="relative bg-destructive/10 rounded-md overflow-hidden">
                                  <div className="p-2 text-xs overflow-auto max-h-[100px]">
                                    <code className="block whitespace-pre font-mono text-xs text-destructive">
                                      {config._error}
                                    </code>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-border flex justify-end">
                            <button
                              type="button"
                              onClick={() => setShowTechnicalDetails(false)}
                              className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900 mb-4">
                  <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-foreground font-medium mb-2">No configuration data available</p>
                <p className="text-sm text-foreground/80 text-center max-w-[300px]">
                  Configuration information for this cluster could not be retrieved.
                </p>
                <div className="mt-4 p-3 rounded-lg border border-border bg-background/80">
                  <p className="text-xs text-foreground/70">Try refreshing the dashboard or check cluster status.</p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <EnhancedButton
            variant="default"
            onClick={onClose}
          >
            Close
          </EnhancedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
