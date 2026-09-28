CREATE TYPE mode_of_payment_enum AS ENUM ('Cash','Cheque','DD','RTGS','UPI');

CREATE TYPE type_of_payee_enum AS ENUM ('Site expenses','Concreting','Steel','Sand','Jelly','Cement','Civil','Plumbing','Tile laying','Electrical','Carpenter','UPVC','Custom');

CREATE TABLE users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT username_not_empty CHECK (length(trim(username)) > 0),
    CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE TABLE vouchers (
    voucher_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_by BIGINT NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    payee TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    amount_in_words TEXT NOT NULL,
    type_of_payee type_of_payee_enum NOT NULL,
    custom_payee_type TEXT,
    mode_of_payment mode_of_payment_enum NOT NULL,
    towards TEXT NOT NULL,
    payee_pan TEXT,
    tds TEXT,
    voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT amount_positive CHECK (amount > 0),
    CONSTRAINT payee_not_empty CHECK (length(trim(payee)) > 0),
    CONSTRAINT amount_words_not_empty CHECK (length(trim(amount_in_words)) > 0),
    CONSTRAINT towards_not_empty CHECK (length(trim(towards)) > 0),
    CONSTRAINT custom_payee_validation CHECK ((type_of_payee='Custom' AND custom_payee_type IS NOT NULL AND length(trim(custom_payee_type))>0) OR (type_of_payee<>'Custom' AND custom_payee_type IS NULL))
);

CREATE INDEX idx_vouchers_created_by ON vouchers(created_by);
CREATE INDEX idx_vouchers_voucher_date ON vouchers(voucher_date);
CREATE INDEX idx_vouchers_user_date ON vouchers(created_by,voucher_date);
CREATE INDEX idx_vouchers_type_of_payee ON vouchers(type_of_payee);
CREATE INDEX idx_vouchers_mode_of_payment ON vouchers(mode_of_payment);
CREATE INDEX idx_vouchers_payee ON vouchers(payee);
CREATE INDEX idx_vouchers_towards ON vouchers(towards);
