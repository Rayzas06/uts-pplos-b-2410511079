const FieldModel = require('../models/fieldModel');


const getFields = async (req, res) => {
  try {
    const page     = parseInt(req.query.page)     || 1;
    const per_page = parseInt(req.query.per_page) || 10;
    const type     = req.query.type   || null;
    const search   = req.query.search || null;

    const result = await FieldModel.findAll({ page, per_page, type, search });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


const getFieldById = async (req, res) => {
  try {
    const field = await FieldModel.findById(req.params.id);
    if (!field) {
      return res.status(404).json({ success: false, message: 'Lapangan tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, data: field });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


const createField = async (req, res) => {
  try {
    const { name, type, location, price_per_hour, description } = req.body;

    if (!name || !type || !location || !price_per_hour) {
      return res.status(422).json({
        success: false,
        message: 'name, type, location, dan price_per_hour wajib diisi.'
      });
    }

    const validTypes = ['futsal','badminton','basketball','tennis','voli'];
    if (!validTypes.includes(type)) {
      return res.status(422).json({
        success: false,
        message: `type harus salah satu dari: ${validTypes.join(', ')}`
      });
    }

    const id = await FieldModel.create({
      name, type, location,
      price_per_hour: parseFloat(price_per_hour),
      description,
      owner_id: req.user.id
    });

    return res.status(201).json({ success: true, message: 'Lapangan berhasil ditambahkan.', data: { id } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


const getSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(422).json({ success: false, message: 'Parameter date wajib diisi (YYYY-MM-DD).' });
    }

    const field = await FieldModel.findById(id);
    if (!field) {
      return res.status(404).json({ success: false, message: 'Lapangan tidak ditemukan.' });
    }

    
    await FieldModel.generateSlots(id, date);

    const slots = await FieldModel.findSlots(id, date);
    return res.status(200).json({ success: true, data: slots });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


const markUnavailable = async (req, res) => {
  try {
    await FieldModel.markSlotUnavailable(req.params.slot_id);
    return res.status(200).json({ success: true, message: 'Slot ditandai tidak tersedia.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


const markAvailable = async (req, res) => {
  try {
    await FieldModel.markSlotAvailable(req.params.slot_id);
    return res.status(200).json({ success: true, message: 'Slot tersedia kembali.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


const ownerDashboard = async (req, res) => {
  try {
    const fields = await FieldModel.getOwnerDashboard(req.user.id);
    return res.status(200).json({ success: true, data: fields });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getFields, getFieldById, createField, getSlots, markUnavailable, markAvailable, ownerDashboard };