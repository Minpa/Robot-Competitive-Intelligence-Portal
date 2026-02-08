-- 허용된 이메일 관리 테이블
CREATE TABLE IF NOT EXISTS allowed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  note VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS allowed_emails_email_idx ON allowed_emails(email);

-- 기본 슈퍼 관리자 이메일 추가
INSERT INTO allowed_emails (email, note) 
VALUES ('somewhere010@gmail.com', '슈퍼 관리자')
ON CONFLICT (email) DO NOTHING;
