document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    const submitBtn = form.querySelector('.submit-btn');
    const loader = document.getElementById('loader');
    const successMessage = document.getElementById('successMessage');

    // バリデーション関数
    function validateName(name) {
        if (!name.trim()) {
            return 'お名前を入力してください';
        }
        if (name.trim().length < 2) {
            return 'お名前は2文字以上で入力してください';
        }
        return '';
    }

    function validateEmail(email) {
        if (!email.trim()) {
            return 'メールアドレスを入力してください';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return '有効なメールアドレスを入力してください';
        }
        return '';
    }

    function validatePhone(phone) {
        if (phone.trim() && phone.trim().length > 0) {
            const phoneRegex = /^[\d-]+$/;
            if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
                return '有効な電話番号を入力してください';
            }
        }
        return '';
    }

    function validateSubject(subject) {
        if (!subject.trim()) {
            return '件名を入力してください';
        }
        return '';
    }

    function validateMessage(message) {
        if (!message.trim()) {
            return 'お問い合わせ内容を入力してください';
        }
        if (message.trim().length < 10) {
            return 'お問い合わせ内容は10文字以上で入力してください';
        }
        return '';
    }

    function validatePrivacy(checked) {
        if (!checked) {
            return 'プライバシーポリシーに同意してください';
        }
        return '';
    }

    // リアルタイムバリデーション
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const subjectInput = document.getElementById('subject');
    const messageInput = document.getElementById('message');
    const privacyInput = document.getElementById('privacy');

    nameInput.addEventListener('blur', function() {
        const error = validateName(nameInput.value);
        document.getElementById('nameError').textContent = error;
        updateFieldError(nameInput, error);
    });

    emailInput.addEventListener('blur', function() {
        const error = validateEmail(emailInput.value);
        document.getElementById('emailError').textContent = error;
        updateFieldError(emailInput, error);
    });

    phoneInput.addEventListener('blur', function() {
        const error = validatePhone(phoneInput.value);
        document.getElementById('phoneError').textContent = error;
        updateFieldError(phoneInput, error);
    });

    subjectInput.addEventListener('blur', function() {
        const error = validateSubject(subjectInput.value);
        document.getElementById('subjectError').textContent = error;
        updateFieldError(subjectInput, error);
    });

    messageInput.addEventListener('blur', function() {
        const error = validateMessage(messageInput.value);
        document.getElementById('messageError').textContent = error;
        updateFieldError(messageInput, error);
    });

    privacyInput.addEventListener('change', function() {
        const error = validatePrivacy(privacyInput.checked);
        document.getElementById('privacyError').textContent = error;
    });

    function updateFieldError(field, error) {
        if (error) {
            field.style.borderColor = '#c45c26';
        } else {
            field.style.borderColor = 'rgba(93, 78, 55, 0.25)';
        }
    }

    // フォーム送信処理
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // すべてのエラーメッセージをクリア
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.textContent = '');

        // バリデーション
        const nameError = validateName(nameInput.value);
        const emailError = validateEmail(emailInput.value);
        const phoneError = validatePhone(phoneInput.value);
        const subjectError = validateSubject(subjectInput.value);
        const messageError = validateMessage(messageInput.value);
        const privacyError = validatePrivacy(privacyInput.checked);

        // エラーメッセージを表示
        document.getElementById('nameError').textContent = nameError;
        document.getElementById('emailError').textContent = emailError;
        document.getElementById('phoneError').textContent = phoneError;
        document.getElementById('subjectError').textContent = subjectError;
        document.getElementById('messageError').textContent = messageError;
        document.getElementById('privacyError').textContent = privacyError;

        // フィールドのスタイルを更新
        updateFieldError(nameInput, nameError);
        updateFieldError(emailInput, emailError);
        updateFieldError(phoneInput, phoneError);
        updateFieldError(subjectInput, subjectError);
        updateFieldError(messageInput, messageError);

        // エラーがある場合は送信しない
        if (nameError || emailError || phoneError || subjectError || messageError || privacyError) {
            if (nameError) nameInput.focus();
            else if (emailError) emailInput.focus();
            else if (phoneError) phoneInput.focus();
            else if (subjectError) subjectInput.focus();
            else if (messageError) messageInput.focus();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.classList.add('loading');

        const formData = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim(),
            subject: subjectInput.value.trim(),
            category: document.getElementById('category').value,
            message: messageInput.value.trim(),
            timestamp: new Date().toISOString()
        };

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));

            successMessage.classList.add('show');
            form.reset();

            setTimeout(() => {
                successMessage.classList.remove('show');
            }, 5000);

            console.log('送信されたデータ:', formData);

        } catch (error) {
            console.error('送信エラー:', error);
            alert('送信に失敗しました。しばらくしてから再度お試しください。');
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    });
});
