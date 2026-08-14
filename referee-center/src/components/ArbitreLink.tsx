"use client";

import Image from "next/image";
import Link from "next/link";

interface ArbitreLinkProps {
  arbitreId: string;
  photoUrl?: string | null;
  name: string;
  category?: string | null;
  showPhoto?: boolean;
}

export default function ArbitreLink({ arbitreId, photoUrl, name, category, showPhoto = true }: ArbitreLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!showPhoto && !photoUrl) {
    // Version simplifiée sans photo (pour HomeClient)
    return (
      <Link
        href={`/arbitres/${arbitreId}`}
        onClick={handleClick}
        className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
      >
        {name}
      </Link>
    );
  }

  return (
    <Link href={`/arbitres/${arbitreId}`} onClick={handleClick} className="flex items-center gap-2 text-sm">
      {showPhoto && photoUrl && (
        <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors flex-shrink-0">
          <Image src={photoUrl} alt={`Photo ${name}`} fill sizes="40px" className="object-cover" />
        </div>
      )}
      <div className="text-right">
        <span className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium block">
          {name}
        </span>
        {category && <span className="text-xs text-gray-500 dark:text-gray-400">{category}</span>}
      </div>
    </Link>
  );
}
