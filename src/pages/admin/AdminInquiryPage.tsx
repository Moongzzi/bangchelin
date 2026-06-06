import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import {
  getAdminInquiries,
  type AdminInquiryListItem,
} from '../../features/report/report.api';
import { Dropdown, type DropdownOptionData } from '../../shared/components/dropdown';
import { SearchBox } from '../../shared/components/search-box';
import { colors } from '../../shared/styles/tokens/colors';
import { ROUTES } from '../../shared/constants/routes';
import { inquiryTypeOptions } from '../report/reportConfig';
import { AdminHeader } from '../../shared/components/layout/AdminHeader';
import { Footer } from '../../shared/components/layout/Footer';
import styles from './AdminInquiryPage.module.css';

type PageStatus = 'loading' | 'ready' | 'error';

const categoryLabelMap = new Map(inquiryTypeOptions.map((option) => [option.value, option.label]));
const allFilterValue = 'all';

const statusLabelMap: Record<AdminInquiryListItem['status'], string> = {
  submitted: '접수 완료',
  reviewing: '처리 중',
  resolved: '처리 완료',
  rejected: '반려',
};

const categoryFilterOptions: DropdownOptionData[] = [
  { value: allFilterValue, label: '문의 종류 전체' },
  ...inquiryTypeOptions,
];

const statusFilterOptions: DropdownOptionData[] = [
  { value: allFilterValue, label: '처리 여부 전체' },
  { value: 'submitted', label: statusLabelMap.submitted },
  { value: 'reviewing', label: statusLabelMap.reviewing },
  { value: 'resolved', label: statusLabelMap.resolved },
  { value: 'rejected', label: statusLabelMap.rejected },
];

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
}

function includesSearchText(inquiry: AdminInquiryListItem, searchText: string) {
  const normalizedSearchText = searchText.trim().toLowerCase();

  if (!normalizedSearchText) {
    return true;
  }

  return [
    categoryLabelMap.get(inquiry.category) ?? inquiry.category,
    inquiry.subject,
    inquiry.nickname,
    statusLabelMap[inquiry.status],
    formatDate(inquiry.createdAt),
  ].some((value) => value.toLowerCase().includes(normalizedSearchText));
}

export function AdminInquiryPage() {
  const [inquiries, setInquiries] = useState<AdminInquiryListItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(allFilterValue);
  const [statusFilter, setStatusFilter] = useState(allFilterValue);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadInquiries() {
      try {
        setStatus('loading');
        const nextInquiries = await getAdminInquiries();

        if (isMounted) {
          setInquiries(nextInquiries);
          setStatus('ready');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : '문의 목록을 불러오지 못했습니다.');
          setStatus('error');
        }
      }
    }

    void loadInquiries();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredInquiries = useMemo(
    () => inquiries.filter((inquiry) => (
      includesSearchText(inquiry, searchText)
      && (categoryFilter === allFilterValue || inquiry.category === categoryFilter)
      && (statusFilter === allFilterValue || inquiry.status === statusFilter)
    )),
    [categoryFilter, inquiries, searchText, statusFilter],
  );

  const pageStyle = {
    '--admin-inquiry-background': colors.background.default,
    '--admin-inquiry-text': colors.text.primary,
    '--admin-inquiry-muted': colors.text.tertiary,
    '--admin-inquiry-header-background': colors.background.subtle,
  } as CSSProperties;

  const filterDropdownStyle = {
    '--dropdown-trigger-min-height': '40px',
    '--dropdown-trigger-padding-x': '12px',
    '--dropdown-option-min-height': '40px',
    '--dropdown-option-padding-x': '12px',
    '--dropdown-label': colors.text.primary,
    '--dropdown-text': colors.text.primary,
    '--dropdown-placeholder': colors.text.primaryAlpha40,
    '--dropdown-outline': colors.border.subtle,
    '--dropdown-icon': colors.text.tertiary,
    '--dropdown-trigger-background': 'transparent',
    '--dropdown-menu-background': colors.background.default,
    '--dropdown-option-background': colors.background.subtle,
  } as CSSProperties;

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearchText(event.target.value);
  }

  return (
    <div className="min-h-screen bg-transparent text-[var(--color-text)]">
      <AdminHeader />
      <main>
        <section className={styles.page} style={pageStyle}>
          <div className={styles.inner}>
            <h1 className={styles.title}>문의하기</h1>

            <div className={styles.toolbar}>
              <SearchBox
                value={searchText}
                onChange={handleSearchChange}
                placeholder="검색어 내용"
                ariaLabel="문의 목록 검색"
                backgroundVariant="transparent"
                className={styles.searchBox}
                iconButton
                fullWidth={false}
              />
              <div className={styles.filterGroup}>
                <Dropdown
                  label="문의 종류 필터"
                  options={categoryFilterOptions}
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  placeholder="문의 종류"
                  hideLabel
                  fullWidth={false}
                  className={styles.filterDropdown}
                  rootStyle={filterDropdownStyle}
                />
                <Dropdown
                  label="처리 여부 필터"
                  options={statusFilterOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="처리 여부"
                  hideLabel
                  fullWidth={false}
                  className={styles.filterDropdown}
                  rootStyle={filterDropdownStyle}
                />
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <colgroup>
                  <col className={styles.typeColumn} />
                  <col className={styles.titleColumn} />
                  <col className={styles.reporterColumn} />
                  <col className={styles.dateColumn} />
                  <col className={styles.statusColumn} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">문의 종류</th>
                    <th scope="col">문의 제목</th>
                    <th scope="col">제보자</th>
                    <th scope="col">제보 날짜</th>
                    <th scope="col">처리 여부</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInquiries.map((inquiry) => (
                    <tr key={inquiry.id}>
                      <td>
                        <Link className={styles.rowLink} to={`${ROUTES.adminInquiries}/${inquiry.id}`}>
                          {categoryLabelMap.get(inquiry.category) ?? inquiry.category}
                        </Link>
                      </td>
                      <td>
                        <Link className={styles.rowLink} to={`${ROUTES.adminInquiries}/${inquiry.id}`}>
                          {inquiry.subject}
                        </Link>
                      </td>
                      <td>
                        <Link className={styles.rowLink} to={`${ROUTES.adminInquiries}/${inquiry.id}`}>
                          {inquiry.nickname}
                        </Link>
                      </td>
                      <td className={styles.dateCell}>
                        <Link className={styles.rowLink} to={`${ROUTES.adminInquiries}/${inquiry.id}`}>
                          {formatDate(inquiry.createdAt)}
                        </Link>
                      </td>
                      <td>
                        <Link className={styles.rowLink} to={`${ROUTES.adminInquiries}/${inquiry.id}`}>
                          {statusLabelMap[inquiry.status]}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {status === 'loading' ? (
              <p className={styles.message}>문의 목록을 불러오는 중입니다.</p>
            ) : null}

            {status === 'error' ? (
              <p className={styles.message} role="alert">{errorMessage}</p>
            ) : null}

            {status === 'ready' && filteredInquiries.length === 0 ? (
              <p className={styles.message}>표시할 문의가 없습니다.</p>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
