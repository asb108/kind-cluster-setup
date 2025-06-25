'use client';

import React from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function AirflowPage() {
  return (
    <div className='container mx-auto p-6'>
      <h1 className='text-3xl font-bold mb-6'>Apache Airflow</h1>
      <Card className='w-full max-w-4xl mb-6'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center'>
              <Image
                src='https://airflow.apache.org/docs/apache-airflow/stable/_images/pin_large.png'
                alt='Airflow'
                className='w-12 h-12 mr-4'
                width={48}
                height={48}
              />
              <div>
                <CardTitle>Apache Airflow</CardTitle>
                <CardDescription>
                  Open-source platform for developing, scheduling, and
                  monitoring batch-oriented workflows
                </CardDescription>
              </div>
            </div>
            <Badge className='bg-green-500 text-white'>Running</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div>
              <h3 className='text-lg font-medium'>Details</h3>
              <div className='grid grid-cols-2 gap-4 mt-2'>
                <div>
                  <p className='text-sm font-medium text-gray-500'>Version</p>
                  <p>2.6.0</p>
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-500'>Namespace</p>
                  <p>airflow</p>
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-500'>Cluster</p>
                  <p>test-1</p>
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-500'>
                    Deployment Method
                  </p>
                  <p>kubectl</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className='text-lg font-medium'>Access Information</h3>
              <div className='grid grid-cols-2 gap-4 mt-2'>
                <div>
                  <p className='text-sm font-medium text-gray-500'>
                    Access URL
                  </p>
                  <p className='text-blue-500 break-all'>
                    <a
                      href='http://localhost:30081'
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      http://localhost:30081
                    </a>
                  </p>
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-500'>
                    Login Credentials
                  </p>
                  <p>
                    Username: <span className='font-mono'>admin</span>
                  </p>
                  <p>
                    Password: <span className='font-mono'>admin</span>
                  </p>
                </div>
              </div>
            </div>

            <div className='flex gap-4 pt-4'>
              <a
                href='http://localhost:30081'
                target='_blank'
                rel='noopener noreferrer'
              >
                <Button className='bg-blue-500 hover:bg-blue-600 text-white'>
                  Access Airflow
                </Button>
              </a>
              <Link href='/manage-apps'>
                <Button variant='outline'>Back to Apps</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
