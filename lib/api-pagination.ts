export type ApiPagination = {
  page: number;
  perPage: number;
  total: number | null;
  totalPages: number | null;
  hasNext: boolean;
  hasPrevious: boolean;
  nextPage: number | null;
  previousPage: number | null;
};

export function paginationFromHeaders(headers: Headers, page: number, perPage: number, itemCount: number): ApiPagination {
  const headerNumber = (name: string) => {
    const value = headers.get(name);
    if (!value || !/^\d+$/.test(value)) return null;
    return Number(value);
  };
  const nextPage = headerNumber("x-next-page");
  const previousPage = headerNumber("x-prev-page");
  const total = headerNumber("x-total");
  const totalPages = headerNumber("x-total-pages") ?? (total !== null ? Math.ceil(total / perPage) : null);
  return {
    page,
    perPage,
    total,
    totalPages,
    hasNext: Boolean(nextPage) || itemCount === perPage,
    hasPrevious: Boolean(previousPage) || page > 1,
    nextPage,
    previousPage,
  };
}

export function paginateItems<T>(items: T[], page: number, perPage: number): { items: T[]; pagination: ApiPagination } {
  const total = items.length;
  const totalPages = total ? Math.ceil(total / perPage) : 0;
  const start = (page - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    pagination: {
      page,
      perPage,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1 && page <= totalPages + 1,
      nextPage: page < totalPages ? page + 1 : null,
      previousPage: page > 1 ? page - 1 : null,
    },
  };
}

export function pageNumber(value: string | null, fallback = 1): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : fallback;
}

export function perPageNumber(value: string | null, fallback = 20): number {
  const perPage = Number(value);
  return Number.isSafeInteger(perPage) && perPage > 0 ? Math.min(perPage, 100) : fallback;
}
