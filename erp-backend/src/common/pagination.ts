export type ListQuery = {
  page?: string;
  pageSize?: string;
  search?: string;
  status?: string;
};

export type PaginationOptions = {
  page: number;
  pageSize: number;
  skip: number;
  search: string;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export function hasListQuery(query: ListQuery) {
  return Boolean(
    query.page ||
    query.pageSize ||
    query.search?.trim() ||
    query.status?.trim(),
  );
}

export function getPaginationOptions(query: ListQuery): PaginationOptions {
  const parsedPage = Number(query.page);
  const parsedPageSize = Number(query.pageSize);
  const page =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : DEFAULT_PAGE;
  const pageSize =
    Number.isInteger(parsedPageSize) && parsedPageSize > 0
      ? Math.min(parsedPageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    search: query.search?.trim() ?? '',
  };
}

export function createPaginatedResult<T>(
  items: T[],
  total: number,
  options: PaginationOptions,
) {
  return {
    items,
    meta: {
      page: options.page,
      pageSize: options.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / options.pageSize)),
    },
  };
}
