const { pool } = require('../config/database');

class FieldModel {

  static async findAll({ page = 1, per_page = 10, type, search }) {
    const offset = (page - 1) * per_page;
    let where = 'WHERE f.is_active = 1';
    const params = [];

    if (type) {
      where += ' AND f.type = ?';
      params.push(type);
    }
    if (search) {
      where += ' AND (f.name LIKE ? OR f.location LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.execute(
      `SELECT f.*, o.business_name 
       FROM fields f
       LEFT JOIN field_owners o ON f.owner_id = o.user_id
       ${where}
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, per_page, offset]
    );

    const countResult = await pool.execute(
      `SELECT COUNT(*) as total FROM fields f ${where}`,
      params
    );
    
    const countRows = Array.isArray(countResult) ? countResult[0] : countResult;
    const totalCount = Array.isArray(countRows) ? countRows[0].total : countRows.total;

    return { 
      data: rows, 
      total: totalCount, 
      page, 
      per_page, 
      total_pages: Math.ceil(totalCount / per_page) 
    };
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT f.*, o.business_name, o.bank_account
       FROM fields f
       LEFT JOIN field_owners o ON f.owner_id = o.user_id
       WHERE f.id = ? AND f.is_active = 1`,
      [id]
    );
    return rows[0] || null;
  }

  static async create({ name, type, location, price_per_hour, description, owner_id }) {
    const [result] = await pool.execute(
      'INSERT INTO fields (name, type, location, price_per_hour, description, owner_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, type, location, price_per_hour, description, owner_id]
    );
    return result.insertId;
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    values.push(id);
    await pool.execute(`UPDATE fields SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async findSlots(field_id, date) {
    const [rows] = await pool.execute(
      `SELECT * FROM slots 
       WHERE field_id = ? AND date = ?
       ORDER BY time_start`,
      [field_id, date]
    );
    return rows;
  }

  static async markSlotUnavailable(slot_id) {
    await pool.execute(
      'UPDATE slots SET is_available = 0 WHERE id = ?',
      [slot_id]
    );
  }


  static async markSlotAvailable(slot_id) {
    await pool.execute(
      'UPDATE slots SET is_available = 1 WHERE id = ?',
      [slot_id]
    );
  }


  static async generateSlots(field_id, date) {
    const hours = ['08:00','09:00','10:00','11:00','12:00','13:00',
                   '14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
    for (let i = 0; i < hours.length - 1; i++) {
      try {
        await pool.execute(
          'INSERT OR IGNORE INTO slots (field_id, date, time_start, time_end) VALUES (?, ?, ?, ?)',
          [field_id, date, hours[i], hours[i+1]]
        );
      } catch (err) {
      }
    }
  }


  static async getOwnerDashboard(owner_id) {
    const [fields] = await pool.execute(
      'SELECT * FROM fields WHERE owner_id = ?',
      [owner_id]
    );
    return fields;
  }
}

module.exports = FieldModel;