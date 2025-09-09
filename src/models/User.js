const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre es requerido"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "El email es requerido"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "La contraseña es requerida"],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["patient", "nutritionist", "admin"],
      default: "patient",
    },
    profile: {
      phone: String,
      address: String,
      birthDate: Date,
      weight: Number,
      height: Number,
      imc: Number,
      gender: {
        type: String,
        enum: ["male", "female", "other"],
      },
      // Campos específicos para nutricionistas
      license: String,
      specialties: [String],
      availability: [
        {
          day: {
            type: String,
            enum: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ],
          },
          hours: [
            {
              start: String,
              end: String,
            },
          ],
        },
      ],
    },
    nutritionistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.role === "patient";
      },
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware para hashear password antes de guardar
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware para calcular IMC automáticamente
userSchema.pre("save", function (next) {
  // Solo calcular IMC si se modificaron peso o altura
  if (this.isModified("profile.weight") || this.isModified("profile.height")) {
    try {
      this.calculateIMC();
    } catch (error) {
      // Si falla el cálculo, continuar sin IMC
      console.log("No se pudo calcular IMC:", error.message);
    }
  }
  next();
});

// Método para comparar passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Método para generar token JWT
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      email: this.email,
    },
    process.env.JWT_SECRET || "test-secret-key",
    { expiresIn: "24h" }
  );
};
//calcular imc
userSchema.methods.calculateIMC = function () {
  if (this.profile && this.profile.weight && this.profile.height) {
    // Validar que los valores sean números válidos y positivos
    const weight = parseFloat(this.profile.weight);
    const height = parseFloat(this.profile.height);
    
    if (isNaN(weight) || isNaN(height) || weight <= 0 || height <= 0) {
      throw new Error("Peso y altura deben ser números válidos y positivos");
    }
    
    const heightInMeters = height / 100; // Convertir cm a metros
    const imc = weight / (heightInMeters * heightInMeters);
    
    // Redondear a 2 decimales
    this.profile.imc = Math.round(imc * 100) / 100;
    
    return this.profile.imc;
  } else {
    throw new Error("Peso y altura son requeridos para calcular IMC");
  }
};

// Método para obtener la categoría del IMC
userSchema.methods.getIMCCategory = function () {
  if (!this.profile || !this.profile.imc) {
    return "No calculado";
  }
  
  const imc = this.profile.imc;
  
  if (imc < 18.5) {
    return "Bajo peso";
  } else if (imc >= 18.5 && imc < 25) {
    return "Peso normal";
  } else if (imc >= 25 && imc < 30) {
    return "Sobrepeso";
  } else if (imc >= 30 && imc < 35) {
    return "Obesidad grado I";
  } else if (imc >= 35 && imc < 40) {
    return "Obesidad grado II";
  } else {
    return "Obesidad grado III";
  }
};
// Métodos estáticos
userSchema.statics.createUser = async function (userData) {
  try {
    const user = new this(userData);
    return await user.save();
  } catch (error) {
    throw new Error(`Error al crear usuario: ${error.message}`);
  }
};

userSchema.statics.findUserByEmail = async function (email) {
  try {
    return await this.findOne({ email });
  } catch (error) {
    throw new Error(`Error al buscar usuario: ${error.message}`);
  }
};

userSchema.statics.findNutritionists = async function () {
  try {
    return await this.find({ role: "nutritionist", active: true });
  } catch (error) {
    throw new Error(`Error al buscar nutricionistas: ${error.message}`);
  }
};

// Agregar método estático para buscar pacientes de un nutricionista
userSchema.statics.findPatientsByNutritionistId = async function (
  nutritionistId
) {
  try {
    return await this.find({
      role: "patient",
      nutritionistId: nutritionistId,
      active: true,
    }).select("-password");
  } catch (error) {
    throw new Error(`Error al buscar pacientes: ${error.message}`);
  }
};

// Método para actualizar perfil
userSchema.methods.updateProfile = async function (profileData) {
  try {
    // Validar género si se proporciona
    if (
      profileData.gender &&
      !["male", "female", "other"].includes(profileData.gender)
    ) {
      throw new Error("Género inválido");
    }

    // Validar peso y altura si se proporcionan
    if (profileData.weight !== undefined) {
      const weight = parseFloat(profileData.weight);
      if (isNaN(weight) || weight <= 0) {
        throw new Error("El peso debe ser un número válido y positivo");
      }
    }

    if (profileData.height !== undefined) {
      const height = parseFloat(profileData.height);
      if (isNaN(height) || height <= 0 || height > 300) {
        throw new Error("La altura debe ser un número válido entre 1 y 300 cm");
      }
    }

    // Validar días de disponibilidad si se proporcionan
    if (profileData.availability) {
      const validDays = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      profileData.availability.forEach((slot) => {
        if (!validDays.includes(slot.day)) {
          throw new Error("Día de disponibilidad inválido");
        }
      });
    }

    // Actualizar solo los campos proporcionados
    if (!this.profile) {
      this.profile = {};
    }

    Object.keys(profileData).forEach((key) => {
      this.profile[key] = profileData[key];
    });

    // El middleware pre('save') se encargará de calcular el IMC automáticamente
    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Error al actualizar perfil: ${error.message}`);
  }
};

const User = mongoose.model("User", userSchema);

module.exports = User;
