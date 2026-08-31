import React, { useState, useEffect, useMemo } from 'react';
import { Student, TeacherRecord, CommitteeReferral, User, AppState } from './types';
import { students, categories, ADMIN_USERS, GOOGLE_APP_SCRIPT_URL } from './data/studentsData';

export default function App() {
  // App state
  const [state, setState] = useState<AppState>({
    users: [],
    records: [],
    studentCycles: {},
    referrals: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('데이터 처리 중...');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Auth state
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [loginName, setLoginName] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [regName, setRegName] = useState('');
  const [regPin, setRegPin] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // View state
  const [currentView, setCurrentView] = useState<'teacher' | 'admin'>('teacher');
  const [adminTab, setAdminTab] = useState<'dashboard' | 'unreceived'>('dashboard');

  // Teacher entry form state
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [cat1, setCat1] = useState('');
  const [cat2, setCat2] = useState('');
  const [catOther, setCatOther] = useState('');
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [recordDetail, setRecordDetail] = useState('');
  const [recordTeacher, setRecordTeacher] = useState('');

  // Admin filter states
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterCurrentCount, setFilterCurrentCount] = useState<string>('');
  const [filterTotalCount, setFilterTotalCount] = useState<string>('');
  const [searchStudentName, setSearchStudentName] = useState<string>('');

  const [sortUnreceived, setSortUnreceived] = useState<'date-asc' | 'class-student'>('date-asc');
  const [filterUnreceivedClass, setFilterUnreceivedClass] = useState<string>('');

  // Modals state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    msg: string;
    onConfirm: () => void;
  }>({ show: false, msg: '', onConfirm: () => {} });

  const [historyModal, setHistoryModal] = useState<{
    show: boolean;
    studentId: string;
    studentName: string;
    tab: 'grouped' | 'all';
  }>({ show: false, studentId: '', studentName: '', tab: 'grouped' });

  const [editModal, setEditModal] = useState<{
    show: boolean;
    recordId: string;
    studentId: string;
    studentName: string;
    cat1: string;
    cat2: string;
    otherDetail: string;
    date: string;
    detail: string;
  }>({
    show: false,
    recordId: '',
    studentId: '',
    studentName: '',
    cat1: '',
    cat2: '',
    otherDetail: '',
    date: '',
    detail: '',
  });

  // NEW: Committee Referral Modal state (생활교육위원회 회부 모달)
  const [referralModal, setReferralModal] = useState<{
    show: boolean;
    student: Student | null;
    round: string;
    date: string;
    note: string;
    selectedCardIds: string[];
  }>({
    show: false,
    student: null,
    round: '1차',
    date: new Date().toISOString().substring(0, 10),
    note: '',
    selectedCardIds: [],
  });

  // Toast trigger
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2500);
  };

  // Confirm helper
  const triggerConfirm = (msg: string, onConfirm: () => void) => {
    setConfirmModal({
      show: true,
      msg,
      onConfirm,
    });
  };

  const closeConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, show: false }));
  };

  // Initial data load
  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    setIsLoading(true);
    setLoadingMsg('서버에서 데이터를 불러오는 중입니다...');
    try {
      const response = await fetch(GOOGLE_APP_SCRIPT_URL);
      const data = await response.json();
      if (data && Array.isArray(data.users)) {
        setState({
          users: data.users || [],
          records: data.records || [],
          studentCycles: data.studentCycles || {},
          referrals: data.referrals || [],
        });
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      showToast('서버 연결 실패. (로컬 데이터로 대체됩니다.)');
      const saved = localStorage.getItem('laraState_v1');
      if (saved) {
        try {
          setState(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveState = async (nextState: AppState) => {
    localStorage.setItem('laraState_v1', JSON.stringify(nextState));
    setIsLoading(true);
    setLoadingMsg('저장 중입니다.');
    try {
      await fetch(GOOGLE_APP_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(nextState),
      });
    } catch (error) {
      console.error('데이터 저장 실패:', error);
      showToast('서버 저장 실패. 다음 접속 시 문제 발생 시 관리자 문의 요망.');
    } finally {
      setIsLoading(false);
    }
  };

  // Student helpers
  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || null;
  }, [selectedStudentId]);

  const getStudentHistory = (studentId: string) => {
    return state.records
      .filter((r) => String(r.studentId) === String(studentId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.timestamp - a.timestamp);
  };

  const getStudentEffectiveCount = (studentId: string) => {
    const total = state.records.filter((r) => String(r.studentId) === String(studentId)).length;
    const cycle = state.studentCycles[studentId] || 0;
    return Math.max(0, total - cycle * 5);
  };

  const getStudentReferrals = (studentId: string) => {
    return (state.referrals || [])
      .filter((ref) => String(ref.studentId) === String(studentId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.timestamp - a.timestamp);
  };

  // Auth actions
  const handleRegister = async () => {
    const name = regName.trim();
    const pin = regPin.trim();

    if (!name || pin.length !== 4) {
      showToast('이름과 4자리 PIN 번호를 정확히 입력해주세요.');
      return;
    }
    if (state.users.find((u) => u.name === name)) {
      showToast('이미 등록된 이름입니다.');
      return;
    }

    const role = ADMIN_USERS.includes(name) ? 'admin' : 'teacher';
    const nextState: AppState = {
      ...state,
      users: [...state.users, { name, pin, role }],
    };

    setState(nextState);
    await saveState(nextState);

    showToast(`교사 등록 완료! (${role === 'admin' ? '관리자' : '일반교사'})`);
    setRegName('');
    setRegPin('');
    setAuthTab('login');
    setLoginName(name);
  };

  const handleLogin = () => {
    const name = loginName.trim();
    const pin = loginPin.trim();

    if (!name || !pin) {
      showToast('이름과 PIN 번호를 모두 입력해주세요.');
      return;
    }

    const user = state.users.find((u) => u.name === name);
    if (!user) {
      showToast('등록된 계정이 없습니다.');
      return;
    }

    if (String(user.pin) === String(pin)) {
      setCurrentUser(user);
      setLoginPin('');
      if (user.role === 'admin') {
        setCurrentView('admin');
        setRecordTeacher(user.name);
      } else {
        setCurrentView('teacher');
        setRecordTeacher(user.name);
      }
    } else {
      showToast('PIN 번호가 일치하지 않습니다.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedStudentId('');
    setSelectedClass('');
    resetTeacherForm();
  };

  const resetTeacherForm = () => {
    setCat1('');
    setCat2('');
    setCatOther('');
    setRecordDetail('');
    setRecordDate(new Date().toISOString().substring(0, 10));
    if (currentUser) {
      setRecordTeacher(currentUser.name);
    }
  };

  const handleClassChange = (classNum: number | '') => {
    setSelectedClass(classNum);
    setSelectedStudentId('');
    resetTeacherForm();
  };

  const handleStudentSelect = (id: string) => {
    setSelectedStudentId(id);
    resetTeacherForm();
  };

  // Submit new reflection card record
  const submitRecord = () => {
    if (!selectedStudent) return;

    if (!cat1 || !cat2 || !recordDate || !recordDetail.trim()) {
      showToast('모든 항목을 입력해주세요.');
      return;
    }
    if (cat2 === '기타' && !catOther.trim()) {
      showToast('기타 상세 사유를 입력해주세요.');
      return;
    }

    let teacherName = currentUser?.name || '';
    if (currentUser && currentUser.role === 'admin' && recordTeacher.trim()) {
      teacherName = recordTeacher.trim();
    }

    const newRecord: TeacherRecord = {
      id: Date.now().toString(),
      studentId: selectedStudent.id,
      teacherName: teacherName,
      date: recordDate,
      cat1: cat1,
      cat2: cat2,
      otherDetail: catOther.trim(),
      detail: recordDetail.trim(),
      received: false,
      timestamp: Date.now(),
    };

    triggerConfirm(`[${selectedStudent.name}] 학생에게\n성찰일지를 등록하시겠습니까?`, async () => {
      const nextState: AppState = {
        ...state,
        records: [...state.records, newRecord],
      };
      setState(nextState);
      await saveState(nextState);
      showToast('성찰일지가 등록되었습니다.');
      resetTeacherForm();
    });
  };

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || ADMIN_USERS.includes(currentUser.name);
  }, [currentUser]);

  // History & Edit / Delete Record
  const openHistoryModal = (studentId: string, studentName: string) => {
    setHistoryModal({
      show: true,
      studentId,
      studentName,
      tab: 'grouped',
    });
  };

  const deleteRecord = (recordId: string, studentId: string, studentName: string) => {
    triggerConfirm('해당 성찰카드 기록을 정말 삭제하시겠습니까?', async () => {
      const nextRecords = state.records.filter((r) => String(r.id) !== String(recordId));
      const nextState: AppState = {
        ...state,
        records: nextRecords,
      };
      setState(nextState);
      await saveState(nextState);
      showToast('기록이 성공적으로 삭제되었습니다.');
    });
  };

  const openEditModal = (record: TeacherRecord, studentName: string) => {
    setEditModal({
      show: true,
      recordId: record.id,
      studentId: record.studentId,
      studentName,
      cat1: record.cat1,
      cat2: record.cat2,
      otherDetail: record.otherDetail || '',
      date: String(record.date).substring(0, 10),
      detail: record.detail,
    });
  };

  const saveEditRecord = async () => {
    if (!editModal.cat1 || !editModal.cat2 || !editModal.date || !editModal.detail.trim()) {
      showToast('모든 항목을 입력해주세요.');
      return;
    }
    if (editModal.cat2 === '기타' && !editModal.otherDetail.trim()) {
      showToast('기타 상세 사유를 입력해주세요.');
      return;
    }

    const nextRecords = state.records.map((r) => {
      if (String(r.id) === String(editModal.recordId)) {
        return {
          ...r,
          cat1: editModal.cat1,
          cat2: editModal.cat2,
          otherDetail: editModal.otherDetail.trim(),
          date: editModal.date,
          detail: editModal.detail.trim(),
        };
      }
      return r;
    });

    const nextState: AppState = {
      ...state,
      records: nextRecords,
    };

    setState(nextState);
    await saveState(nextState);
    showToast('기록이 성공적으로 수정되었습니다.');
    setEditModal((prev) => ({ ...prev, show: false }));
  };

  // Mark card as received
  const markAsReceived = (recordId: string) => {
    triggerConfirm('해당 카드를 수합 완료 처리하시겠습니까?', async () => {
      const nextRecords = state.records.map((r) => {
        if (String(r.id) === String(recordId)) {
          return { ...r, received: true };
        }
        return r;
      });
      const nextState: AppState = {
        ...state,
        records: nextRecords,
      };
      setState(nextState);
      await saveState(nextState);
      showToast('수합 완료 처리되었습니다.');
    });
  };

  // ============================================================================
  // NEW FEATURE: 5회 누적시 생활교육위원회 회부 처리 모달 열기 & 처리
  // ============================================================================
  const openCommitteeReferralModal = (student: Student) => {
    const studentHistory = getStudentHistory(student.id);
    const existingReferrals = getStudentReferrals(student.id);
    const nextRoundNumber = (state.studentCycles[student.id] || 0) + 1;
    const roundText = `${nextRoundNumber}차`;

    // 기본 선택: 여태 받은 카드 중 이전에 회부되지 않은 카드들(최신 5장) 또는 전체
    const alreadyReferredIds = new Set(
      existingReferrals.flatMap((ref) => ref.selectedCardIds || [])
    );
    const unreferredCards = studentHistory.filter((c) => !alreadyReferredIds.has(c.id));
    const initialSelectedIds =
      unreferredCards.length >= 5
        ? unreferredCards.slice(0, 5).map((c) => c.id)
        : unreferredCards.length > 0
        ? unreferredCards.map((c) => c.id)
        : studentHistory.slice(0, 5).map((c) => c.id);

    setReferralModal({
      show: true,
      student,
      round: roundText,
      date: new Date().toISOString().substring(0, 10),
      note: `5회 누적에 따른 제${roundText} 생활교육위원회 회부`,
      selectedCardIds: initialSelectedIds,
    });
  };

  const handleToggleCardSelection = (cardId: string) => {
    setReferralModal((prev) => {
      const exists = prev.selectedCardIds.includes(cardId);
      const nextIds = exists
        ? prev.selectedCardIds.filter((id) => id !== cardId)
        : [...prev.selectedCardIds, cardId];
      return { ...prev, selectedCardIds: nextIds };
    });
  };

  const handleSelectAllCards = (allIds: string[]) => {
    setReferralModal((prev) => ({
      ...prev,
      selectedCardIds: allIds,
    }));
  };

  const handleDeselectAllCards = () => {
    setReferralModal((prev) => ({
      ...prev,
      selectedCardIds: [],
    }));
  };

  const submitCommitteeReferral = async () => {
    if (!referralModal.student) return;
    if (referralModal.selectedCardIds.length === 0) {
      showToast('생교위 회부 대상 성찰카드를 1개 이상 선택해주세요.');
      return;
    }
    if (!referralModal.round.trim()) {
      showToast('생교위 차수(예: 1차)를 입력해주세요.');
      return;
    }

    const student = referralModal.student;
    const roundName = referralModal.round.trim().endsWith('차')
      ? referralModal.round.trim()
      : `${referralModal.round.trim()}차`;

    const newReferral: CommitteeReferral = {
      id: Date.now().toString(),
      studentId: student.id,
      studentName: student.name,
      round: roundName,
      date: referralModal.date || new Date().toISOString().substring(0, 10),
      selectedCardIds: referralModal.selectedCardIds,
      note: referralModal.note.trim() || `5회 누적에 따른 제${roundName} 생활교육위원회 회부`,
      timestamp: Date.now(),
      teacherName: currentUser?.name || '',
    };

    const nextCycles = {
      ...state.studentCycles,
      [student.id]: (state.studentCycles[student.id] || 0) + 1,
    };

    const nextReferrals = [...(state.referrals || []), newReferral];

    const nextState: AppState = {
      ...state,
      studentCycles: nextCycles,
      referrals: nextReferrals,
    };

    setState(nextState);
    await saveState(nextState);

    showToast(`[${student.name}] 학생의 ${roundName} 생활교육위원회 회부 처리 및 누적 초기화가 완료되었습니다.`);
    setReferralModal((prev) => ({ ...prev, show: false }));
  };

  // Filtered students for All-Students table
  const allFilteredStudents = useMemo(() => {
    let target = students
      .map((s) => {
        const history = getStudentHistory(s.id);
        if (history.length === 0) return null;
        const effectiveCount = getStudentEffectiveCount(s.id);
        const latestDate = history[0]?.date || '';
        return {
          ...s,
          effectiveCount,
          totalCount: history.length,
          latestDate,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    if (searchStudentName.trim()) {
      target = target.filter((s) => s.name.toLowerCase().includes(searchStudentName.trim().toLowerCase()));
    }
    if (filterClass) {
      target = target.filter((s) => s.classNum === parseInt(filterClass));
    }
    if (filterCurrentCount) {
      const fCount = parseInt(filterCurrentCount);
      target = fCount === 5 ? target.filter((s) => s.effectiveCount >= 5) : target.filter((s) => s.effectiveCount === fCount);
    }
    if (filterTotalCount) {
      const fCount = parseInt(filterTotalCount);
      target = fCount === 5 ? target.filter((s) => s.totalCount >= 5) : target.filter((s) => s.totalCount === fCount);
    }

    return target.sort((a, b) => a.id.localeCompare(b.id));
  }, [students, state.records, state.studentCycles, searchStudentName, filterClass, filterCurrentCount, filterTotalCount]);

  // Filtered and sorted unreceived cards
  const unreceivedCards = useMemo(() => {
    let list = state.records.filter((r) => !r.received);

    if (filterUnreceivedClass) {
      list = list.filter((r) => {
        const s = students.find((st) => String(st.id) === String(r.studentId));
        return s && s.classNum === parseInt(filterUnreceivedClass);
      });
    }

    list.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

      if (sortUnreceived === 'date-asc') {
        if (dateA !== dateB) return dateA - dateB;
        if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
        return String(a.studentId).localeCompare(String(b.studentId));
      } else {
        if (a.studentId !== b.studentId) return String(a.studentId).localeCompare(String(b.studentId));
        if (dateA !== dateB) return dateA - dateB;
        return a.timestamp - b.timestamp;
      }
    });

    return list;
  }, [state.records, filterUnreceivedClass, sortUnreceived]);

  // Accumulated students lists (3, 4, 5+ counts)
  const accumulatedStudents = useMemo(() => {
    const list3: { student: Student; count: number }[] = [];
    const list4: { student: Student; count: number }[] = [];
    const list5: { student: Student; count: number }[] = [];

    students.forEach((s) => {
      const count = getStudentEffectiveCount(s.id);
      if (count === 3) list3.push({ student: s, count });
      else if (count === 4) list4.push({ student: s, count });
      else if (count >= 5) list5.push({ student: s, count });
    });

    return { list3, list4, list5 };
  }, [students, state.records, state.studentCycles]);

  return (
    <div className="text-slate-800 antialiased h-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Loading Overlay */}
      {isLoading && (
        <div id="loading-overlay" className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center fade-in">
          <div className="bg-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-4">
            <div className="w-6 h-6 border-3 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <span id="loading-msg" className="font-semibold text-slate-700">
              {loadingMsg}
            </span>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div
          id="toast"
          className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300"
        >
          {toastMsg}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.show && (
        <div id="confirm-modal" className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[70] p-4 fade-in">
          <div className="bg-white p-6 rounded-xl shadow-xl w-11/12 max-w-md">
            <h3 id="confirm-msg" className="text-lg font-semibold mb-6 text-center text-slate-700 whitespace-pre-line leading-relaxed">
              {confirmModal.msg}
            </h3>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={closeConfirm}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
              >
                취소
              </button>
              <button
                type="button"
                id="confirm-btn"
                onClick={() => {
                  confirmModal.onConfirm();
                  closeConfirm();
                }}
                className="px-5 py-2.5 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 transition font-medium"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: 생활교육위원회 회부 처리 모달 */}
      {referralModal.show && referralModal.student && (
        <div
          id="referral-modal"
          className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[80] p-4 fade-in"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-red-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-950">
                    생활교육위원회 회부 처리
                  </h3>
                  <p className="text-xs text-red-700">
                    대상 학생: <span className="font-bold">{referralModal.student.id} {referralModal.student.name}</span> (현재 누적 {getStudentEffectiveCount(referralModal.student.id)}회)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReferralModal((prev) => ({ ...prev, show: false }))}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* 회차 및 일자 입력 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    생교위 차수 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      id="referral-round-input"
                      value={referralModal.round}
                      onChange={(e) => setReferralModal((prev) => ({ ...prev, round: e.target.value }))}
                      placeholder="예: 1차"
                      className="w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none bg-white text-sm font-semibold text-slate-800"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">몇 차 생활교육위원회인지 기재하세요</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    회부 일자 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="referral-date-input"
                    value={referralModal.date}
                    onChange={(e) => setReferralModal((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none bg-white text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    간단한 회부 정보 / 안건 메모
                  </label>
                  <input
                    type="text"
                    id="referral-note-input"
                    value={referralModal.note}
                    onChange={(e) => setReferralModal((prev) => ({ ...prev, note: e.target.value }))}
                    placeholder="생교위 회부 안건 및 간단한 정보를 기재하세요"
                    className="w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none bg-white text-sm"
                  />
                </div>
              </div>

              {/* 여태 그 학생이 받았던 성찰카드 중 선택 */}
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      회부 대상 성찰카드 선택
                    </h4>
                    <p className="text-xs text-slate-500">
                      여태 발급된 성찰카드 중 이번 생교위 안건으로 회부할 카드를 선택하세요. (총 {getStudentHistory(referralModal.student.id).length}건 중 <strong className="text-red-600">{referralModal.selectedCardIds.length}건</strong> 선택됨)
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs flex-shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleSelectAllCards(getStudentHistory(referralModal.student!.id).map((c) => c.id))}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition text-center leading-tight border border-slate-200 shadow-2xs whitespace-nowrap"
                    >
                      전체<br />선택
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllCards}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition text-center leading-tight border border-slate-200 shadow-2xs whitespace-nowrap"
                    >
                      선택<br />해제
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto bg-white shadow-inner">
                  {getStudentHistory(referralModal.student.id).length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">성찰카드 발급 기록이 없습니다.</div>
                  ) : (
                    getStudentHistory(referralModal.student.id).map((card, idx, arr) => {
                      const cardNum = arr.length - idx;
                      const isSelected = referralModal.selectedCardIds.includes(card.id);
                      const reason = card.cat2 === '기타' ? `기타(${card.otherDetail})` : card.cat2;
                      
                      // Check if already in a previous referral
                      const previousReferral = (state.referrals || []).find((ref) =>
                        String(ref.studentId) === String(referralModal.student?.id) &&
                        ref.selectedCardIds?.includes(card.id)
                      );

                      return (
                        <label
                          key={card.id}
                          className={`flex items-start gap-3 p-3 transition cursor-pointer ${
                            isSelected ? 'bg-red-50/70 border-l-4 border-l-red-500' : 'hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleCardSelection(card.id)}
                            className="mt-1 w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="bg-slate-800 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                                {cardNum}
                              </span>
                              <span className="text-xs font-semibold text-slate-700">
                                {String(card.date).substring(0, 10)}
                              </span>
                              <span className="text-xs text-slate-500">
                                | 지도: {card.teacherName} 선생님
                              </span>
                              {previousReferral && (
                                <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded">
                                  {previousReferral.round} 기회부
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-bold text-indigo-700 mb-0.5">
                              [{card.cat1}] {reason}
                            </div>
                            <div className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-1.5 rounded border border-slate-100">
                              {card.detail}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Guide Note */}
              <div className="text-[12px] text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
                <span className="text-amber-600 font-bold">ℹ️</span>
                <div>
                  <strong>회부 및 초기화 안내:</strong> 회부 처리 시 해당 학생의 현재 누적 횟수(5회)가 초기화되며, 선택한 성찰카드와 기재된 차수 정보가 생활교육위원회 회부 이력으로 영구 보관됩니다. (이전 성찰카드 기록은 삭제되지 않습니다.)
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReferralModal((prev) => ({ ...prev, show: false }))}
                className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-semibold text-sm transition"
              >
                취소
              </button>
              <button
                type="button"
                id="btn-confirm-referral"
                onClick={submitCommitteeReferral}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm shadow-md transition flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                회부 처리 및 5회 누적 초기화
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Edit Modal */}
      {editModal.show && (
        <div id="edit-modal" className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4 fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-slate-800">지도 기록 수정</h3>
              <button
                type="button"
                onClick={() => setEditModal((prev) => ({ ...prev, show: false }))}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">1차 분류</label>
                  <select
                    id="edit-cat1"
                    value={editModal.cat1}
                    onChange={(e) => {
                      const newCat1 = e.target.value;
                      const availableSub = categories[newCat1] || [];
                      setEditModal((prev) => ({
                        ...prev,
                        cat1: newCat1,
                        cat2: availableSub.length > 0 ? availableSub[0] : '',
                      }));
                    }}
                    className="w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-200 outline-none bg-white text-sm"
                  >
                    <option value="">영역 선택</option>
                    {Object.keys(categories).map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">2차 세부항목</label>
                  <select
                    id="edit-cat2"
                    value={editModal.cat2}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, cat2: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-200 outline-none bg-white text-sm"
                  >
                    <option value="">세부항목 선택</option>
                    {(categories[editModal.cat1] || []).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editModal.cat2 === '기타' && (
                <div id="edit-other-input-container">
                  <label className="block text-sm font-medium text-slate-500 mb-1">기타 상세 사유</label>
                  <input
                    type="text"
                    id="edit-cat-other"
                    value={editModal.otherDetail}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, otherDetail: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-200 outline-none bg-white text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">지도 일시</label>
                <input
                  type="date"
                  id="edit-record-date"
                  value={editModal.date}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full sm:w-1/2 border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-200 outline-none bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">상세 지도 내용</label>
                <textarea
                  id="edit-record-detail"
                  rows={4}
                  value={editModal.detail}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, detail: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:ring-2 focus:ring-indigo-200 outline-none bg-white text-sm resize-none"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditModal((prev) => ({ ...prev, show: false }))}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg transition hover:bg-slate-200"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={saveEditRecord}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg transition hover:bg-indigo-700"
                >
                  수정 내용 저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal.show && (() => {
        const modalStudentHistory = getStudentHistory(historyModal.studentId);
        const modalStudentReferrals = getStudentReferrals(historyModal.studentId);
        const cycleCount = state.studentCycles[historyModal.studentId] || 0;
        const effectiveCount = getStudentEffectiveCount(historyModal.studentId);
        const referredCardIdSet = new Set(
          modalStudentReferrals.flatMap((ref) => ref.selectedCardIds || [])
        );
        const activeCards = modalStudentHistory.filter((c) => !referredCardIdSet.has(c.id));

        return (
          <div id="history-modal" className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl font-bold text-slate-800" id="history-modal-title">
                    {historyModal.studentId} {historyModal.studentName} 기록
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    학생 지도 이력 및 생활교육위원회 회부 기록
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryModal((prev) => ({ ...prev, show: false }))}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Summary stats banner */}
              <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3 text-slate-700">
                  <span>
                    총 발급: <strong>{modalStudentHistory.length}</strong>회
                  </span>
                  <span>|</span>
                  <span>
                    현재 누적:{' '}
                    <strong className="text-indigo-600 font-bold">
                      {effectiveCount}
                    </strong>
                    회
                  </span>
                  <span>|</span>
                  <span>
                    생교위 회부:{' '}
                    <strong className="text-red-600 font-bold">
                      {modalStudentReferrals.length}
                    </strong>
                    건
                  </span>
                  {cycleCount > 0 && (
                    <span className="text-red-600 font-medium">
                      (초기화 {cycleCount}회 반영)
                    </span>
                  )}
                </div>

                {/* Tab switcher */}
                <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setHistoryModal((prev) => ({ ...prev, tab: 'grouped' }))}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                      historyModal.tab === 'grouped'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    생교위별 묶어보기
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryModal((prev) => ({ ...prev, tab: 'all' }))}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                      historyModal.tab === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    전체 시간순
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4" id="history-modal-content">
                {modalStudentHistory.length === 0 ? (
                  <div className="text-center text-slate-400 py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    등록된 지도 이력이 없습니다.
                  </div>
                ) : historyModal.tab === 'grouped' ? (
                  <div className="space-y-5">
                    {/* 생활교육위원회 회부 이력 및 관련 성찰카드 */}
                    {modalStudentReferrals.length > 0 && (
                      <div className="space-y-3.5">
                        <h4 className="text-xs font-bold text-red-950 flex items-center gap-1.5 uppercase tracking-wide">
                          <span className="w-2 h-2 rounded-full bg-red-600"></span>
                          생활교육위원회 회부 이력 ({modalStudentReferrals.length}건)
                        </h4>

                        {modalStudentReferrals.map((ref) => {
                          const bundledCards = modalStudentHistory.filter((c) =>
                            ref.selectedCardIds?.includes(c.id)
                          );

                          return (
                            <div
                              key={ref.id}
                              className="border-2 border-red-200 bg-red-50/40 rounded-xl p-4 space-y-3 shadow-xs"
                            >
                              {/* Referral info header */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-200/80 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="bg-red-600 text-white font-bold text-xs px-2.5 py-1 rounded-md shadow-xs">
                                    {ref.round} 생활교육위원회
                                  </span>
                                  <span className="text-xs font-semibold text-slate-700">
                                    회부일자: {String(ref.date).substring(0, 10)}
                                  </span>
                                </div>
                                <span className="text-xs text-slate-500 font-medium">
                                  처리 교사: <strong className="text-slate-800">{ref.teacherName}</strong> 선생님
                                </span>
                              </div>

                              {/* Referral note */}
                              {ref.note && (
                                <div className="text-xs bg-white p-3 rounded-lg border border-red-100 text-slate-700 shadow-2xs">
                                  <span className="font-bold text-red-700 mr-1.5">[회부 안건 / 메모]</span>
                                  {ref.note}
                                </div>
                              )}

                              {/* Bundled Reflection Cards */}
                              <div className="space-y-2">
                                <div className="text-xs font-bold text-red-900 flex items-center justify-between">
                                  <span className="flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    회부 관련 성찰카드 ({bundledCards.length}건)
                                  </span>
                                </div>

                                {bundledCards.length === 0 ? (
                                  <div className="text-xs text-slate-400 italic bg-white/70 p-3 rounded-lg text-center border border-red-100">
                                    지정된 성찰카드 정보가 없습니다.
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {bundledCards.map((card) => {
                                      const originalIdx = modalStudentHistory.findIndex((c) => c.id === card.id);
                                      const cardNum = modalStudentHistory.length - originalIdx;
                                      const reason = card.cat2 === '기타' ? `기타(${card.otherDetail})` : card.cat2;

                                      return (
                                        <div
                                          key={card.id}
                                          className="bg-white border border-red-100/90 rounded-lg p-3 shadow-2xs"
                                        >
                                          <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                              <span className="bg-red-700 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                                                {cardNum}
                                              </span>
                                              <span className="text-xs font-semibold text-slate-700">
                                                {String(card.date).substring(0, 10)}
                                              </span>
                                              <span className="text-xs text-slate-400">
                                                | 지도: {card.teacherName} 선생님
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              {card.received ? (
                                                <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                                  수합됨
                                                </span>
                                              ) : (
                                                <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                                  미수합
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-xs font-bold text-indigo-700 mb-1">
                                            [{card.cat1}] {reason}
                                          </div>
                                          <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-wrap">
                                            {card.detail}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 현재 누적 진행 중인 성찰카드 섹션 */}
                    <div className="border border-slate-200 bg-slate-50/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                          현재 누적 진행 중인 성찰카드 ({activeCards.length}건)
                        </h4>
                        <span className="text-xs text-indigo-700 font-bold">
                          현재 누적: {effectiveCount}회
                        </span>
                      </div>

                      {activeCards.length === 0 ? (
                        <div className="text-xs text-slate-400 text-center py-4 bg-white rounded-lg border border-slate-100">
                          현재 진행 중인 미회부 성찰카드가 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {activeCards.map((card) => {
                            const originalIdx = modalStudentHistory.findIndex((c) => c.id === card.id);
                            const cardNum = modalStudentHistory.length - originalIdx;
                            const reason = card.cat2 === '기타' ? `기타(${card.otherDetail})` : card.cat2;
                            const canEdit =
                              currentUser &&
                              (currentUser.role === 'admin' || card.teacherName === currentUser.name);

                            return (
                              <div
                                key={card.id}
                                className="border border-slate-200 rounded-lg p-3.5 bg-white shadow-2xs relative group"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                                      {cardNum}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-700">
                                      {String(card.date).substring(0, 10)}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      | 지도: {card.teacherName} 선생님
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {card.received ? (
                                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                                        수합됨
                                      </span>
                                    ) : (
                                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                                        미수합
                                      </span>
                                    )}
                                    {canEdit && (
                                      <div className="flex items-center gap-1.5 ml-1">
                                        <button
                                          type="button"
                                          onClick={() => openEditModal(card, historyModal.studentName)}
                                          className="text-[11px] text-slate-400 hover:text-indigo-600 transition font-semibold"
                                        >
                                          수정
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            deleteRecord(card.id, historyModal.studentId, historyModal.studentName)
                                          }
                                          className="text-[11px] text-slate-400 hover:text-red-600 transition font-semibold"
                                        >
                                          삭제
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs font-bold text-indigo-700 mb-1">
                                  [{card.cat1}] {reason}
                                </div>
                                <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 whitespace-pre-wrap">
                                  {card.detail}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* 전체 시간순 목록 */
                  <div className="space-y-3">
                    {modalStudentHistory.map((r, idx, arr) => {
                      const cardNum = arr.length - idx;
                      const reason = r.cat2 === '기타' ? `기타(${r.otherDetail})` : r.cat2;
                      const canEdit =
                        currentUser && (currentUser.role === 'admin' || r.teacherName === currentUser.name);

                      const matchingReferral = (state.referrals || []).find(
                        (ref) =>
                          String(ref.studentId) === String(historyModal.studentId) &&
                          ref.selectedCardIds?.includes(r.id)
                      );

                      return (
                        <div
                          key={r.id}
                          className="border border-slate-200 rounded-lg p-4 bg-white relative group shadow-2xs"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                                {cardNum}
                              </span>
                              <span className="text-sm font-semibold text-slate-600">
                                {String(r.date).substring(0, 10)}
                              </span>
                              <span className="text-sm text-slate-400">| 지도: {r.teacherName} 선생님</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {matchingReferral ? (
                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold border border-red-200">
                                  {matchingReferral.round} 생교위
                                </span>
                              ) : (
                                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-semibold border border-indigo-100">
                                  현재 누적
                                </span>
                              )}
                              {r.received ? (
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-semibold">
                                  수합됨
                                </span>
                              ) : (
                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-semibold">
                                  미수합
                                </span>
                              )}
                              {canEdit && (
                                <div className="flex items-center gap-2 ml-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(r, historyModal.studentName)}
                                    className="text-xs text-slate-400 hover:text-indigo-600 transition font-semibold"
                                  >
                                    수정
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteRecord(r.id, historyModal.studentId, historyModal.studentName)
                                    }
                                    className="text-xs text-slate-400 hover:text-red-600 transition font-semibold"
                                  >
                                    삭제
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mb-2">
                            <span className="font-bold text-indigo-700">[{r.cat1}]</span> {reason}
                          </div>
                          <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-100 whitespace-pre-wrap">
                            {r.detail}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* App Header */}
      <header className="bg-white text-slate-800 border-b border-slate-200 shadow-sm z-10 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold tracking-tight">라라로운 생활지도</h1>
          </div>

          {currentUser && (
            <div id="header-user-info" className="flex items-center gap-3 text-sm font-medium">
              <span id="header-welcome-text" className="text-indigo-700 flex items-center">
                {currentUser.name} 선생님
                {currentUser.role === 'admin' && (
                  <span className="ml-2 bg-slate-800 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    관리자
                  </span>
                )}
              </span>

              {currentView === 'teacher' ? (
                <button
                  type="button"
                  id="btn-goto-admin"
                  onClick={() => setCurrentView('admin')}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-md transition text-xs border border-slate-200 flex items-center gap-1"
                >
                  누적 현황 보기
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-goto-teacher"
                  onClick={() => setCurrentView('teacher')}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-md transition text-xs border border-slate-200 flex items-center gap-1"
                >
                  성찰카드 입력
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-slate-600 transition"
                title="로그아웃"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-hidden relative bg-slate-50">
        {/* LOGIN SCREEN */}
        {!currentUser && (
          <div id="login-screen" className="absolute inset-0 overflow-y-auto flex items-center justify-center p-4 bg-slate-50">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  id="tab-login"
                  onClick={() => setAuthTab('login')}
                  className={`flex-1 py-4 text-center transition ${
                    authTab === 'login' ? 'border-b-2 border-[#1e3a8a] text-[#1e3a8a] font-semibold' : 'text-slate-500 font-normal'
                  }`}
                >
                  교사 로그인
                </button>
                <button
                  type="button"
                  id="tab-register"
                  onClick={() => setAuthTab('register')}
                  className={`flex-1 py-4 text-center transition ${
                    authTab === 'register' ? 'border-b-2 border-[#1e3a8a] text-[#1e3a8a] font-semibold' : 'text-slate-500 font-normal'
                  }`}
                >
                  신규 교사 등록
                </button>
              </div>

              <div className="p-8">
                {authTab === 'login' ? (
                  <form
                    id="form-login"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleLogin();
                    }}
                    className="space-y-5 fade-in"
                  >
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">이름 입력</label>
                      <input
                        type="text"
                        id="login-name"
                        value={loginName}
                        onChange={(e) => setLoginName(e.target.value)}
                        placeholder="실명을 입력하세요"
                        className="w-full border-slate-300 rounded-lg shadow-sm py-2.5 px-3 focus:ring-indigo-500 focus:border-indigo-500 border outline-none bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">PIN 번호 (4자리)</label>
                      <input
                        type="password"
                        id="login-pin"
                        maxLength={4}
                        value={loginPin}
                        onChange={(e) => setLoginPin(e.target.value)}
                        placeholder="••••"
                        className="w-full border-slate-300 rounded-lg shadow-sm py-2.5 px-3 focus:ring-indigo-500 focus:border-indigo-500 border outline-none bg-slate-50 text-center tracking-[1em] font-bold"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-lg shadow-md transition mt-2 cursor-pointer"
                    >
                      교사 인증하기
                    </button>
                  </form>
                ) : (
                  <form
                    id="form-register"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRegister();
                    }}
                    className="space-y-5 fade-in"
                  >
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">교사 이름</label>
                      <input
                        type="text"
                        id="reg-name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="실명을 입력하세요"
                        className="w-full border-slate-300 rounded-lg shadow-sm py-2.5 px-3 focus:ring-indigo-500 focus:border-indigo-500 border outline-none bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">PIN 번호 설정 (4자리 숫자)</label>
                      <input
                        type="password"
                        id="reg-pin"
                        maxLength={4}
                        value={regPin}
                        onChange={(e) => setRegPin(e.target.value)}
                        placeholder="••••"
                        className="w-full border-slate-300 rounded-lg shadow-sm py-2.5 px-3 focus:ring-indigo-500 focus:border-indigo-500 border outline-none bg-slate-50 text-center tracking-[1em] font-bold"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg shadow-md transition mt-2 cursor-pointer"
                    >
                      교사 등록하기
                    </button>
                    <p className="text-[11px] text-center text-slate-500 mt-2">
                      * 교사 로그인 문의 - 안효은 선생님(0296)
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TEACHER VIEW */}
        {currentUser && currentView === 'teacher' && (
          <div id="app-screen" className="h-full flex flex-col max-w-4xl mx-auto w-full p-4 sm:p-8 overflow-y-auto space-y-6">
            {/* Student selection card */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="font-bold text-lg text-indigo-900 flex items-center gap-2 mb-6">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                학생 선택 (1학년)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">반 선택</label>
                  <select
                    id="select-class"
                    value={selectedClass}
                    onChange={(e) => handleClassChange(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full border border-indigo-600 rounded-lg shadow-sm py-3 px-3 focus:ring-2 focus:ring-indigo-200 outline-none bg-white text-slate-700 text-sm appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%234F46E5%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 1rem top 50%',
                      backgroundSize: '0.65rem auto',
                    }}
                  >
                    <option value="">반을 선택하세요 (1~8반)</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
                      <option key={c} value={c}>
                        {c}반
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">학생 선택</label>
                  <select
                    id="select-student"
                    value={selectedStudentId}
                    disabled={!selectedClass}
                    onChange={(e) => handleStudentSelect(e.target.value)}
                    className={`w-full border rounded-lg shadow-sm py-3 px-3 focus:ring-2 focus:ring-indigo-200 outline-none text-sm appearance-none ${
                      selectedClass
                        ? 'border-indigo-600 bg-white text-slate-700'
                        : 'border-slate-200 bg-slate-50 text-slate-400 opacity-70'
                    }`}
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394A3B8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 1rem top 50%',
                      backgroundSize: '0.65rem auto',
                    }}
                  >
                    <option value="">학생을 선택하세요</option>
                    {selectedClass &&
                      students
                        .filter((s) => s.classNum === selectedClass)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.num}번 {s.name}
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              {selectedStudent && (
                <div id="selected-student-summary" className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 fade-in">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-indigo-900" id="selected-student-name">
                      {selectedStudent.name}
                    </h3>
                    <span className="text-xs font-semibold bg-indigo-200 text-indigo-800 px-2.5 py-1 rounded-md tracking-wide" id="selected-student-info">
                      {selectedStudent.id}
                    </span>
                  </div>
                  <div className="bg-white px-4 py-2.5 rounded-lg shadow-sm border border-indigo-100 text-sm flex items-center gap-3">
                    <div className="font-medium text-slate-600">
                      누적 카드:{' '}
                      <span id="selected-student-count" className="font-bold text-red-600 text-lg ml-1">
                        {getStudentEffectiveCount(selectedStudent.id)}
                      </span>
                      회
                    </div>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <button
                      type="button"
                      onClick={() => openHistoryModal(selectedStudent.id, selectedStudent.name)}
                      className="text-indigo-600 hover:text-indigo-800 font-bold text-sm flex items-center gap-1 transition cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      기록 보기
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Entry Form Card */}
            <div id="input-container" className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 fade-in mb-8">
              <h2 className={`font-bold text-lg flex items-center gap-2 mb-6 ${selectedStudent ? 'text-slate-800' : 'text-slate-400'}`}>
                <svg className={`w-5 h-5 ${selectedStudent ? 'text-indigo-400' : 'text-indigo-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                성찰카드 발급 정보
              </h2>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${selectedStudent ? 'text-slate-500' : 'text-slate-400'}`}>
                      1차 분류 (영역)
                    </label>
                    <select
                      id="cat1"
                      disabled={!selectedStudent}
                      value={cat1}
                      onChange={(e) => {
                        setCat1(e.target.value);
                        setCat2('');
                        setCatOther('');
                      }}
                      className={`w-full border rounded-lg shadow-sm py-3 px-3 focus:ring-2 focus:ring-indigo-200 outline-none text-sm appearance-none ${
                        selectedStudent ? 'border-slate-300 bg-white text-slate-700' : 'border-slate-100 bg-slate-50 text-slate-700 opacity-70'
                      }`}
                    >
                      <option value="">영역 선택</option>
                      {Object.keys(categories).map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${selectedStudent ? 'text-slate-500' : 'text-slate-400'}`}>
                      2차 세부항목
                    </label>
                    <select
                      id="cat2"
                      disabled={!selectedStudent || !cat1}
                      value={cat2}
                      onChange={(e) => {
                        setCat2(e.target.value);
                        if (e.target.value !== '기타') setCatOther('');
                      }}
                      className={`w-full border rounded-lg shadow-sm py-3 px-3 focus:ring-2 focus:ring-indigo-200 outline-none text-sm appearance-none ${
                        selectedStudent && cat1 ? 'border-slate-300 bg-white text-slate-700' : 'border-slate-100 bg-slate-50 text-slate-700 opacity-70'
                      }`}
                    >
                      <option value="">세부항목 선택</option>
                      {cat1 &&
                        (categories[cat1] || []).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {cat2 === '기타' && (
                  <div id="other-input-container" className="fade-in">
                    <label className="block text-sm font-medium text-slate-500 mb-2">기타 상세 사유</label>
                    <input
                      type="text"
                      id="cat-other"
                      value={catOther}
                      onChange={(e) => setCatOther(e.target.value)}
                      placeholder="구체적인 위반 내용을 입력하세요"
                      className="w-full border border-slate-200 rounded-lg shadow-sm py-3 px-3 focus:ring-2 focus:ring-indigo-200 outline-none bg-white text-slate-700 text-sm"
                    />
                  </div>
                )}

                {currentUser && currentUser.role === 'admin' && (
                  <div id="admin-teacher-input-container" className="fade-in">
                    <label className={`block text-sm font-medium mb-2 ${selectedStudent ? 'text-slate-500' : 'text-slate-400'}`}>
                      지도 교사 (대리 입력 시 수정 가능)
                    </label>
                    <input
                      type="text"
                      id="record-teacher"
                      disabled={!selectedStudent}
                      value={recordTeacher}
                      onChange={(e) => setRecordTeacher(e.target.value)}
                      className={`w-full sm:w-1/2 border rounded-lg shadow-sm py-3 px-3 focus:ring-2 focus:ring-indigo-200 outline-none text-sm ${
                        selectedStudent ? 'border-slate-300 bg-white text-slate-700' : 'border-slate-100 bg-slate-50 text-slate-700 opacity-70'
                      }`}
                    />
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-2 ${selectedStudent ? 'text-slate-500' : 'text-slate-400'}`}>
                    지도 일시
                  </label>
                  <input
                    type="date"
                    id="record-date"
                    disabled={!selectedStudent}
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className={`w-full sm:w-1/2 border rounded-lg shadow-sm py-3 px-3 focus:ring-2 focus:ring-indigo-200 outline-none text-sm ${
                      selectedStudent ? 'border-slate-300 bg-white text-slate-700' : 'border-slate-100 bg-slate-50 text-slate-700 opacity-70'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${selectedStudent ? 'text-slate-500' : 'text-slate-400'}`}>
                    상세 지도 내용
                  </label>
                  <textarea
                    id="record-detail"
                    rows={4}
                    disabled={!selectedStudent}
                    value={recordDetail}
                    onChange={(e) => setRecordDetail(e.target.value)}
                    placeholder="당시 상황과 지도 내용을 상세히 기술해주세요."
                    className={`w-full border rounded-lg shadow-sm py-3 px-3 focus:ring-2 focus:ring-indigo-200 outline-none text-sm resize-none ${
                      selectedStudent ? 'border-slate-300 bg-white text-slate-700' : 'border-slate-100 bg-slate-50 text-slate-700 opacity-70'
                    }`}
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    id="btn-submit"
                    disabled={!selectedStudent}
                    onClick={submitRecord}
                    className={`w-full py-4 font-bold rounded-lg transition text-lg tracking-wide ${
                      selectedStudent
                        ? 'bg-indigo-500 hover:bg-indigo-600 shadow-md text-white cursor-pointer'
                        : 'bg-slate-400 text-white pointer-events-none'
                    }`}
                  >
                    성찰카드 등록하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN VIEW */}
        {currentUser && currentView === 'admin' && (
          <div id="admin-screen" className="h-full flex flex-col bg-slate-100 overflow-hidden">
            {/* Admin Tabs */}
            <div className="bg-white border-b border-slate-200 shadow-sm flex px-4 gap-2 flex-shrink-0 overflow-x-auto">
              <button
                type="button"
                id="admin-tab-dashboard"
                onClick={() => setAdminTab('dashboard')}
                className={`px-5 py-4 font-semibold text-sm whitespace-nowrap transition ${
                  adminTab === 'dashboard'
                    ? 'border-b-2 border-indigo-700 text-indigo-700'
                    : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                누적 현황 관리
              </button>
              {currentUser.role === 'admin' && (
                <button
                  type="button"
                  id="admin-tab-unreceived"
                  onClick={() => setAdminTab('unreceived')}
                  className={`px-5 py-4 font-semibold text-sm whitespace-nowrap transition ${
                    adminTab === 'unreceived'
                      ? 'border-b-2 border-indigo-700 text-indigo-700'
                      : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  미수합 성찰카드
                </button>
              )}
            </div>

            {/* Admin Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto w-full">
              {/* TAB 1: DASHBOARD */}
              {adminTab === 'dashboard' && (
                <div id="admin-view-dashboard" className="fade-in space-y-6">
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="font-bold text-slate-800 text-lg mb-2">생활지도 누적 대상자</h2>
                    <p className="text-sm text-slate-500 mb-6">
                      규칙에 따라 3회, 4회, 5회 이상 누적된 학생 목록입니다. 이름을 클릭하면 상세 내역을 볼 수 있습니다.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* 3 count */}
                      <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 flex flex-col">
                        <div className="border-b border-yellow-200 pb-2 mb-3">
                          <h3 className="font-bold text-yellow-800">3회 누적 (성찰문 작성)</h3>
                        </div>
                        <div id="admin-list-3" className="space-y-2 flex-1">
                          {accumulatedStudents.list3.length === 0 ? (
                            <div className="text-sm text-slate-400 p-2 text-center">대상자 없음</div>
                          ) : (
                            accumulatedStudents.list3.map(({ student, count }) => (
                              <div
                                key={student.id}
                                className="bg-white p-3 rounded border border-slate-200 shadow-sm flex justify-between items-center"
                              >
                                <div
                                  className="cursor-pointer hover:text-indigo-600 transition"
                                  onClick={() => openHistoryModal(student.id, student.name)}
                                >
                                  <span className="font-bold text-slate-800">
                                    {student.id} {student.name}
                                  </span>
                                  <div className="text-xs text-slate-500 mt-1">현재 누적: {count}회</div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* 4 count */}
                      <div className="bg-orange-50 rounded-lg border border-orange-200 p-4 flex flex-col">
                        <div className="border-b border-orange-200 pb-2 mb-3">
                          <h3 className="font-bold text-orange-800">4회 누적 (성찰교실)</h3>
                        </div>
                        <div id="admin-list-4" className="space-y-2 flex-1">
                          {accumulatedStudents.list4.length === 0 ? (
                            <div className="text-sm text-slate-400 p-2 text-center">대상자 없음</div>
                          ) : (
                            accumulatedStudents.list4.map(({ student, count }) => (
                              <div
                                key={student.id}
                                className="bg-white p-3 rounded border border-slate-200 shadow-sm flex justify-between items-center"
                              >
                                <div
                                  className="cursor-pointer hover:text-indigo-600 transition"
                                  onClick={() => openHistoryModal(student.id, student.name)}
                                >
                                  <span className="font-bold text-slate-800">
                                    {student.id} {student.name}
                                  </span>
                                  <div className="text-xs text-slate-500 mt-1">현재 누적: {count}회</div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* 5 count: Enhanced with referral modal */}
                      <div className="bg-red-50 rounded-lg border border-red-200 p-4 flex flex-col">
                        <div className="border-b border-red-200 pb-2 mb-3">
                          <h3 className="font-bold text-red-800">5회 누적 (생활교육위원회)</h3>
                        </div>
                        <div id="admin-list-5" className="space-y-2 flex-1">
                          {accumulatedStudents.list5.length === 0 ? (
                            <div className="text-sm text-slate-400 p-2 text-center">대상자 없음</div>
                          ) : (
                            accumulatedStudents.list5.map(({ student, count }) => (
                              <div
                                key={student.id}
                                className="bg-white p-3 rounded border border-slate-200 shadow-sm flex justify-between items-center gap-2"
                              >
                                <div
                                  className="cursor-pointer hover:text-indigo-600 transition"
                                  onClick={() => openHistoryModal(student.id, student.name)}
                                >
                                  <span className="font-bold text-slate-800">
                                    {student.id} {student.name}
                                  </span>
                                  <div className="text-xs text-slate-500 mt-1">현재 누적: {count}회</div>
                                </div>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => openCommitteeReferralModal(student)}
                                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-medium shadow-sm transition whitespace-nowrap cursor-pointer"
                                  >
                                    회부 및 초기화
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* All Students cumulative table */}
                    <div className="mt-10 border-t border-slate-200 pt-8">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-4 gap-4">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">전체 성찰카드 누적 현황</h3>
                          <p className="text-sm text-slate-500">성찰카드를 1회 이상 받은 모든 학생의 전체 리스트입니다.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">반:</label>
                            <select
                              id="filter-class"
                              value={filterClass}
                              onChange={(e) => setFilterClass(e.target.value)}
                              className="border border-slate-300 rounded-lg py-1.5 px-2 text-sm focus:ring-indigo-500 outline-none bg-white"
                            >
                              <option value="">전체</option>
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
                                <option key={c} value={c}>
                                  {c}반
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">현재 누적:</label>
                            <select
                              id="filter-current-count"
                              value={filterCurrentCount}
                              onChange={(e) => setFilterCurrentCount(e.target.value)}
                              className="border border-slate-300 rounded-lg py-1.5 px-2 text-sm focus:ring-indigo-500 outline-none bg-white"
                            >
                              <option value="">전체</option>
                              <option value="1">1회</option>
                              <option value="2">2회</option>
                              <option value="3">3회</option>
                              <option value="4">4회</option>
                              <option value="5">5회 이상</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">총 누적:</label>
                            <select
                              id="filter-total-count"
                              value={filterTotalCount}
                              onChange={(e) => setFilterTotalCount(e.target.value)}
                              className="border border-slate-300 rounded-lg py-1.5 px-2 text-sm focus:ring-indigo-500 outline-none bg-white"
                            >
                              <option value="">전체</option>
                              <option value="1">1회</option>
                              <option value="2">2회</option>
                              <option value="3">3회</option>
                              <option value="4">4회</option>
                              <option value="5">5회 이상</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">이름 검색:</label>
                            <input
                              type="text"
                              id="search-student-name"
                              value={searchStudentName}
                              onChange={(e) => setSearchStudentName(e.target.value)}
                              placeholder="학생 이름"
                              className="w-full sm:w-32 border border-slate-300 rounded-lg py-1.5 px-3 text-sm focus:ring-indigo-500 outline-none bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        {allFilteredStudents.length === 0 ? (
                          <div id="all-students-empty" className="text-center py-10 text-slate-400 bg-white">
                            검색 결과가 없거나 성찰카드를 받은 학생이 없습니다.
                          </div>
                        ) : (
                          <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-xs text-slate-600 bg-slate-100 uppercase">
                              <tr>
                                <th className="px-4 py-3 text-center">학년</th>
                                <th className="px-4 py-3 text-center">반</th>
                                <th className="px-4 py-3 text-center">번호</th>
                                <th className="px-4 py-3">이름</th>
                                <th className="px-4 py-3 text-center">현재 누적</th>
                                <th className="px-4 py-3 text-center">총 누적(초기화 포함)</th>
                                <th className="px-4 py-3 text-center">최근 지도 일자</th>
                                <th className="px-4 py-3 text-center">상세 기록</th>
                              </tr>
                            </thead>
                            <tbody id="all-students-tbody" className="divide-y divide-slate-200 bg-white">
                              {allFilteredStudents.map((s) => {
                                let countBadgeClass = 'bg-slate-100 text-slate-700';
                                if (s.effectiveCount >= 5) countBadgeClass = 'bg-red-100 text-red-700 font-bold';
                                else if (s.effectiveCount === 4) countBadgeClass = 'bg-orange-100 text-orange-700 font-bold';
                                else if (s.effectiveCount === 3) countBadgeClass = 'bg-yellow-100 text-yellow-700 font-bold';

                                return (
                                  <tr key={s.id} className="hover:bg-slate-50 transition">
                                    <td className="px-4 py-3 text-center text-slate-600">{s.grade}</td>
                                    <td className="px-4 py-3 text-center text-slate-600">{s.classNum}</td>
                                    <td className="px-4 py-3 text-center text-slate-600">{s.num}</td>
                                    <td className="px-4 py-3 font-bold text-slate-900">{s.name}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`px-2.5 py-1 rounded-full text-xs ${countBadgeClass}`}>
                                        {s.effectiveCount}회
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-500 text-sm">{s.totalCount}회</td>
                                    <td className="px-4 py-3 text-center text-slate-600 text-sm">
                                      {String(s.latestDate).substring(0, 10)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => openHistoryModal(s.id, s.name)}
                                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-xs font-semibold transition border border-indigo-200 shadow-sm cursor-pointer"
                                      >
                                        기록 보기
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: UNRECEIVED CARDS */}
              {adminTab === 'unreceived' && (
                <div id="admin-view-unreceived" className="fade-in">
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-4 gap-4">
                      <div>
                        <h2 className="font-bold text-slate-800 text-lg mb-1">미수합 성찰카드 관리</h2>
                        <p className="text-sm text-slate-500">
                          교사가 시스템에 입력했으나, 아직 실물 일지를 제출받지 못한 목록입니다.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">정렬 기준:</label>
                          <select
                            id="sort-unreceived"
                            value={sortUnreceived}
                            onChange={(e) => setSortUnreceived(e.target.value as 'date-asc' | 'class-student')}
                            className="border border-slate-300 rounded-lg py-1.5 px-2 text-sm focus:ring-indigo-500 outline-none bg-white"
                          >
                            <option value="date-asc">날짜순 (오래된 순)</option>
                            <option value="class-student">반/학생순</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">반 필터:</label>
                          <select
                            id="filter-unreceived-class"
                            value={filterUnreceivedClass}
                            onChange={(e) => setFilterUnreceivedClass(e.target.value)}
                            className="border border-slate-300 rounded-lg py-1.5 px-2 text-sm focus:ring-indigo-500 outline-none bg-white"
                          >
                            <option value="">전체</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
                              <option key={c} value={c}>
                                {c}반
                              </option>
                            ))}
                          </select>
                        </div>
                        <span
                          id="unreceived-count"
                          className="text-xs font-semibold px-3 py-1.5 bg-red-100 text-red-700 rounded-lg whitespace-nowrap shadow-sm"
                        >
                          총 {unreceivedCards.length}건
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      {unreceivedCards.length === 0 ? (
                        <div id="unreceived-empty" className="text-center py-10 text-slate-400 bg-white">
                          모든 성찰카드가 수합되었습니다.
                        </div>
                      ) : (
                        <table className="w-full text-sm text-left whitespace-nowrap">
                          <thead className="text-xs text-slate-600 bg-slate-100 uppercase">
                            <tr>
                              <th className="px-4 py-3 text-center">반</th>
                              <th className="px-4 py-3 text-center">번호</th>
                              <th className="px-4 py-3">이름</th>
                              <th className="px-4 py-3 text-center">지도일자</th>
                              <th className="px-4 py-3 text-center">지도교사</th>
                              <th className="px-4 py-3">사유</th>
                              <th className="px-4 py-3 text-center">수합확인</th>
                            </tr>
                          </thead>
                          <tbody id="unreceived-tbody" className="divide-y divide-slate-200 bg-white">
                            {unreceivedCards.map((r) => {
                              const s = students.find((st) => String(st.id) === String(r.studentId));
                              const reason = r.cat2 === '기타' ? `기타(${r.otherDetail})` : r.cat2;
                              return (
                                <tr key={r.id} className="bg-white hover:bg-slate-50 transition">
                                  <td className="px-4 py-3 text-center text-slate-600">{s?.classNum || '-'}</td>
                                  <td className="px-4 py-3 text-center text-slate-600">{s?.num || '-'}</td>
                                  <td className="px-4 py-3 font-bold text-slate-900">{s?.name || '-'}</td>
                                  <td className="px-4 py-3 text-center font-medium text-indigo-700">
                                    {String(r.date).substring(0, 10)}
                                  </td>
                                  <td className="px-4 py-3 text-center text-slate-600">{r.teacherName}</td>
                                  <td className="px-4 py-3 text-slate-700 text-sm">
                                    <span className="font-semibold text-indigo-600">[{r.cat1}]</span> {reason}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => markAsReceived(r.id)}
                                      className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs rounded-lg font-bold transition shadow-sm border border-emerald-200 cursor-pointer"
                                    >
                                      수합 완료
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
