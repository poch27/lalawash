-- 08: third staff role between owner and staff
alter type staff_role add value if not exists 'manager';
