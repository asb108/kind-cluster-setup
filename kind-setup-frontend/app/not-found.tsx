import Link from 'next/link';

export default function NotFound() {
  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <div className='rounded-lg border bg-card p-8 text-card-foreground shadow-lg max-w-md w-full animate-in fade-in duration-300'>
        <div className='flex items-center gap-2 mb-2'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='text-primary'
          >
            <circle cx='12' cy='12' r='10'></circle>
            <line x1='12' y1='8' x2='12' y2='12'></line>
            <line x1='12' y1='16' x2='12.01' y2='16'></line>
          </svg>
          <h2 className='text-xl font-bold'>Not Found</h2>
        </div>
        <p className='text-muted-foreground mb-6'>
          Could not find the requested resource
        </p>
        <Link
          href='/'
          className='w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center'
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
