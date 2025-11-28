document.addEventListener('DOMContentLoaded', async () => {
    // Supabase Client Setup
    // ❗️❗️❗️ 아래 두 값을 당신의 Supabase 프로젝트 값으로 변경하세요 ❗️❗️❗️
    const SUPABASE_URL = 'https://piydvzljlejbxctfuegt.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWR2emxqbGVqYnhjdGZ1ZWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzgzMjAsImV4cCI6MjA3OTg1NDMyMH0.k-PDxqsTdKaDVDxsBfCGSgvxnc3XTD-kb6zOA0p56lw';
    const { createClient } = supabase;
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Modal elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeBtn = document.querySelector('.close-btn');
    const programSelectModal = document.getElementById('program-select-modal');

    // Main page elements
    const roomSelection = document.getElementById('room-selection');
    const programSelect = document.getElementById('program-select');
    const newProgramNameInput = document.getElementById('new-program-name');
    const addProgramBtn = document.getElementById('add-program-btn');
    const removeProgramBtn = document.getElementById('remove-program-btn');
    const rowsInput = document.getElementById('rows');
    const colsInput = document.getElementById('cols');
    const applyConfigBtn = document.getElementById('apply-config-btn');
    const seatMap = document.getElementById('seat-map');

    let currentRoom = 'room1';
    let currentProgram = '';

    // appData는 이제 DB에서 불러온 데이터로 채워집니다.
    let appData = {};

    // Supabase에 현재 상태 저장
    async function saveState() {
        console.log('saveState 시작...', appData);
        
        try {
            const { data, error } = await supabaseClient
                .from('seat_data')
                .upsert({ id: 1, data: appData }, { onConflict: 'id' });
            
            console.log('Supabase 응답:', { data, error });
            
            if (error) {
                console.error('Error saving state:', error);
                alert('❌ 데이터 저장에 실패했습니다.\n\n오류: ' + error.message + '\n\n코드: ' + error.code);
                return false;
            } else {
                console.log('저장 성공!');
                alert('✅ 변경 사항이 저장되었습니다!');
                return true;
            }
        } catch (err) {
            console.error('saveState 예외 발생:', err);
            alert('❌ 저장 중 오류가 발생했습니다.\n\n' + err.message);
            return false;
        }
    }

    // Supabase에서 상태 불러오기
    async function loadState() {
        const { data, error } = await supabaseClient
            .from('seat_data')
            .select('data')
            .eq('id', 1)
            .single();

        if (error) {
            console.error('Error loading state:', error);
            console.log('Supabase 테이블이 없거나 데이터가 없습니다. 초기 데이터를 생성합니다.');
            
            // 초기 데이터 설정
            appData = {
                programs: ['ChatGPT', 'Default'],
                rooms: {
                    room1: { rows: 5, cols: 5, seats: {} },
                    room2: { rows: 6, cols: 7, seats: {} }
                }
            };
            
            // 초기 데이터를 Supabase에 저장 시도
            const { error: insertError } = await supabaseClient
                .from('seat_data')
                .insert({ id: 1, data: appData });
            
            if (insertError) {
                console.error('Error creating initial data:', insertError);
                alert('⚠️ Supabase 연결 실패\n\n로컬 모드로 실행됩니다.\n\nSupabase 설정을 확인하세요:\n1. 테이블 "seat_data" 생성\n2. RLS 정책 설정\n3. API URL과 Key 확인');
            }
        } else if (data && data.data) {
            appData = data.data;
            // rooms 객체가 없는 경우 초기화
            if (!appData.rooms) {
                appData.rooms = {
                    room1: { rows: 5, cols: 5, seats: {} },
                    room2: { rows: 6, cols: 7, seats: {} }
                };
            }
            // programs 배열이 없는 경우 초기화
            if (!appData.programs) {
                appData.programs = ['ChatGPT', 'Default'];
            }
        } else {
            // data는 있지만 data.data가 없는 경우
            appData = {
                programs: ['ChatGPT', 'Default'],
                rooms: {
                    room1: { rows: 5, cols: 5, seats: {} },
                    room2: { rows: 6, cols: 7, seats: {} }
                }
            };
        }
    }

    function renderPrograms() {
        programSelect.innerHTML = '';
        if (programSelectModal) programSelectModal.innerHTML = '';

        // appData.programs가 없을 경우를 대비
        if (!appData.programs) appData.programs = [];

        appData.programs.forEach(program => {
            const option = document.createElement('option');
            option.value = program;
            option.textContent = program;
            programSelect.appendChild(option);
            if (programSelectModal) programSelectModal.appendChild(option.cloneNode(true));
        });

        if (appData.programs.length > 0) {
            const lastSelected = currentProgram && appData.programs.includes(currentProgram) ? currentProgram : appData.programs[0];
            currentProgram = lastSelected;
            programSelect.value = currentProgram;
            if(programSelectModal) programSelectModal.value = currentProgram;
        } else {
            currentProgram = '';
        }
        renderSeats();
    }

    function renderSeats() {
        seatMap.innerHTML = '';
        
        // rooms 객체가 없는 경우 처리
        if (!appData.rooms) {
            appData.rooms = {
                room1: { rows: 5, cols: 5, seats: {} },
                room2: { rows: 6, cols: 7, seats: {} }
            };
        }
        
        const roomData = appData.rooms[currentRoom];
        if (!roomData) return;

        seatMap.style.gridTemplateColumns = `repeat(${roomData.cols}, 1fr)`;
        rowsInput.value = roomData.rows;
        colsInput.value = roomData.cols;

        for (let i = 0; i < roomData.rows * roomData.cols; i++) {
            const seat = document.createElement('div');
            seat.classList.add('seat');
            seat.dataset.seatId = i;

            const seatKey = `${currentProgram}-${i}`;
            if (roomData.seats[seatKey]) {
                seat.textContent = roomData.seats[seatKey];
                seat.classList.add('occupied');
            }

            seat.addEventListener('click', () => {
                const userId = prompt('Enter User ID for this seat:', seat.textContent);
                if (userId !== null) {
                    if (userId === '') {
                        delete roomData.seats[seatKey];
                        seat.textContent = '';
                        seat.classList.remove('occupied');
                    } else {
                        roomData.seats[seatKey] = userId;
                        seat.textContent = userId;
                        seat.classList.add('occupied');
                    }
                }
            });
            seatMap.appendChild(seat);
        }
    }

    // Modal Logic
    if (settingsBtn) {
        settingsBtn.onclick = function() {
            settingsModal.style.display = "block";
        }
    }
    if (closeBtn) {
        closeBtn.onclick = function() {
            settingsModal.style.display = "none";
        }
    }
    window.onclick = function(event) {
        if (event.target == settingsModal) {
            settingsModal.style.display = "none";
        }
    }


    function switchRoom(room) {
        currentRoom = room;
        document.querySelectorAll('.room-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.room === room);
        });
        renderSeats();
    }

    roomSelection.addEventListener('click', (e) => {
        if (e.target.classList.contains('room-btn')) {
            switchRoom(e.target.dataset.room);
        }
    });

    programSelect.addEventListener('change', () => {
        currentProgram = programSelect.value;
        renderSeats();
    });


    addProgramBtn.addEventListener('click', () => {
        const newProgram = newProgramNameInput.value.trim();
        if (newProgram && !appData.programs.includes(newProgram)) {
            appData.programs.push(newProgram);
            newProgramNameInput.value = '';
            renderPrograms();
            alert(`Program "${newProgram}" added. Save 버튼을 눌러 저장하세요.`);
        } else if (appData.programs.includes(newProgram)) {
            alert('Program already exists.');
        }
    });

    removeProgramBtn.addEventListener('click', () => {
        if (appData.programs.length <= 1) {
            alert("You can't remove the last program.");
            return;
        }
        const selectedProgram = programSelectModal.value;
        if (selectedProgram && confirm(`Are you sure you want to remove the program "${selectedProgram}"?`)) {
            appData.programs = appData.programs.filter(p => p !== selectedProgram);
            
            // Remove associated seat data
            Object.values(appData.rooms).forEach(room => {
                Object.keys(room.seats).forEach(seatKey => {
                    if (seatKey.startsWith(`${selectedProgram}-`)) {
                        delete room.seats[seatKey];
                    }
                });
            });

            renderPrograms();
            alert(`Program "${selectedProgram}" removed. Save 버튼을 눌러 저장하세요.`);
        }
    });

    applyConfigBtn.addEventListener('click', () => {
        const rows = parseInt(rowsInput.value, 10);
        const cols = parseInt(colsInput.value, 10);

        if (rows > 0 && cols > 0) {
            const roomData = appData.rooms[currentRoom];
            roomData.rows = rows;
            roomData.cols = cols;
            renderSeats();
            alert('Seat configuration updated! Save 버튼을 눌러 저장하세요.');
        } else {
            alert('Please enter valid numbers for rows and columns.');
        }
    });

    // Save Button Event Listener
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            console.log('Save 버튼 클릭됨');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            try {
                await saveState();
            } catch (err) {
                console.error('Save 버튼 오류:', err);
                alert('저장 중 오류 발생: ' + err.message);
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
            }
        });
    } else {
        console.error('Save 버튼을 찾을 수 없습니다!');
    }

    // Initial Load
    await loadState(); // 앱 시작 시 DB에서 데이터 불러오기
    renderPrograms();
    switchRoom(currentRoom);
});
