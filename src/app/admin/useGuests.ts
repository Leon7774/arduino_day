import { useState, useEffect, useTransition, useCallback } from "react";
import { getGuests } from "./actions";

export type Guest = Awaited<ReturnType<typeof getGuests>>["guests"][0];

export function useGuests() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const fetchGuests = useCallback(
    async (query = search, p = page) => {
      const data = await getGuests(query, p, 20); // 20 items per page
      setGuests(data.guests);
      setTotal(data.total);
      setTotalPages(data.totalPages || 1);
    },
    [search, page],
  );

  // Initial fetch and dependency on page
  useEffect(() => {
    startTransition(() => {
      fetchGuests(search, page);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1); // Reset to page 1 on new search
    startTransition(() => {
      fetchGuests(val, 1);
    });
  };

  return {
    guests,
    total,
    totalPages,
    page,
    setPage,
    search,
    handleSearch,
    isPending,
    fetchGuests,
  };
}
