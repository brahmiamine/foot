"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface SearchBoxProps {
  placeholder: string;
  paramName?: string;
}

export default function SearchBox({ placeholder, paramName = "q" }: SearchBoxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialValue = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(searchParams.get(paramName) ?? "");
  }, [searchParams, paramName]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const updateQuery = (nextValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextValue.trim()) {
      params.set(paramName, nextValue.trim());
    } else {
      params.delete(paramName);
    }
    // Toute nouvelle recherche repart de la première page.
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setValue(nextValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateQuery(nextValue), 400);
  };

  return (
    <div className="relative w-full">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
