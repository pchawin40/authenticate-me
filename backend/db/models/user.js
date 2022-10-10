'use strict';
const {
  Model, Validator
} = require('sequelize');

const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    //? toSafeObject: return an object with only User intance information 
    toSafeObject() {
      const { id, username, email } = this; // context will be the User instance
      return { id, username, email };
    }

    //? validatePassword: return boolean whether password match User's hashedPassword
    validatePassword(password) {
      return bcrypt.compareSync(password, this.hashedPassword.toString());
    }

    //? getCurrentUserById: return User with provided id
    static getCurrentUserById(id) {
      return User.scope("currentUser").findByPk(id);
    }
    
    //? login: search for User with specified credential if found
    static async login({ credential, password }) {
      const { Op } = require('sequelize');
      const user = await User.scope('currentUser').findOne({
        where: {
          [Op.or]: {
            username: credential,
            email: credential
          }
        }
      });
      if (user && user.validatePassword(password)) {
        return await User.scope('currentUser').findByPk(user.id);
      }
    }

    //? signup: create User with provided username, email, and password
    static async signup({ username, email, password }) {
      const hashedPassword = bcrypt.hashSync(password);
      const user = await User.create({
        username,
        email,
        hashedPassword
      });
      return await User.scope('currentUser').findByPk(user.id);
    }

    static associate(models) {
      // define association here
    }
  };

  User.init({
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [4, 30],
        isNotEmail(value) {
          if (Validator.isEmail(value)) {
            throw new Error("Cannot be an email.");
          }
        }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [3, 256],
        isEmail: true
      }
    },
    hashedPassword: {
      type: DataTypes.STRING.BINARY,
      allowNull: false,
      validate: {
        len: [60, 60]
      }
    }
  }, {
    sequelize,
    modelName: 'User',
    defaultScope: {
      // default query that return only username
      attributes: {
        exclude: ["hashedPassword", "email", "createdAt", "updatedAt"]
      }
    },
    scopes: {
      // define User model scope for currentUser that exclude only hashedPassword
      User: {
        // model scope that only exclude hashedPassword
        attributes: {
          exclude: ["hashedPassword"]
        }
      },
      currentUser: {
        // include all fields
        attributes: {}
      }
    },
  });
  return User;
};
