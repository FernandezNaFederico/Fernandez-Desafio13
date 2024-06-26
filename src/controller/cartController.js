const CartRepository = require('../repositories/cartRepository.js');
const cartRepository = new CartRepository();
const ProductRepository = require('../repositories/productRepository.js');
const productRepository = new ProductRepository();
const TicketModel = require('../models/tickets.model.js');
const UserModel = require("../models/user.model.js");
const { codeGen, totalPrice } = require("../utils/cartLogic.js");
const logger = require("../utils/logger.js");
const MailingManager = require("../utils/mailing.js");
const mailingManager = new MailingManager();

class CartController {

    async createCart(req, res) {
        try {

            const cart = await cartRepository.createCart();
            logger.info("carrito creado con éxito desde controllers"),
            res.json(cart);

        } catch (error) {

            logger.error("Error al crear un nuevo carrito", error);
            res.status(500).json({ error: "Error interno del servidor" });
        }

    }

    async getCart(req, res) {

        try {
            const cartId = req.params.cid;
            const cart = await cartRepository.findById(cartId);
            if (!cart) {
                req.logger.warning('No existe ese carrito con el id');
                return res.status(404).json({ error: "Carrito no encontrado" });
            }
            return res.json(cart.products);
        } catch (error) {
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }


    async addProductToCart(req, res) {

        const cartId = req.params.cid;
        const productId = req.params.pid;
        const quantity = req.body.quantity || 1;

        try {
            await cartRepository.addProductToCart(cartId, productId, quantity);
            res.redirect(`/carts/${cartId}`);
            //res.json(result.products);
        } catch (error) {
            res.send('Error al intentar guardar producto en el carrito');
            res.status(400).json({ error: "Error al agregar producto al carrito" });
        }
    }

    async deleteProdFromCart(req, res) {
        try {
            const cartId = req.params.cid;
            const productId = req.params.pid;

            const updatedCart = await cartRepository.deleteProdFromCart(cartId, productId);

            res.json({
                status: 'success',
                message: 'El producto se ha eliminado del carrito satisfactoriamente',
                updatedCart,
            });
        } catch (error) {
            req.logger.error('Error al eliminar el producto del carrito', error);
            res.status(500).json({
                status: 'error',
                error: 'Error interno del servidor',
            });
        }
    }

    async updateCart(req, res) {
        const cartId = req.params.cid;
        const updatedProducts = req.body;

        try {
            const updatedCart = await cartRepository.updateCart(cartId, updatedProducts);
            res.json(updatedCart);
        } catch (error) {
            req.logger.error('Error al actualizar el carrito', error);
            res.status(500).json({
                status: 'error',
                error: 'Error al actualizar el carrito',
            });
        }
    }


    async updateProdQuantity(req, res) {
        try {
            const cartId = req.params.cid;
            const productId = req.params.pid;
            const newQuantity = req.body.quantity;

            const updatedCart = await cartRepository.updateProdQuantity(cartId, productId, newQuantity);

            res.json({
                status: 'success',
                message: 'Cantidad del producto actualizada correctamente',
                updatedCart,
            });
        } catch (error) {
            req.logger.error('Error al actualizar la cantidad del producto en el carrito', error);
            res.status(500).json({
                status: 'error',
                error: 'Error actualizar la cantidad de productos',
            });
        }
    }

    async emptyCart(req, res) {
        try {
            const cartId = req.params.cid;

            const updatedCart = await cartRepository.emptyCart(cartId);

            res.json({
                status: 'success',
                message: 'Todos los productos del carrito fueron eliminados correctamente',
                updatedCart,
            });
        } catch (error) {
            req.logger.error('Error al vaciar el carrito', error);
            res.status(500).json({
                status: 'error',
                error: 'Error al vaciar el carrito',
            });
        }
    }

    async endPurchase(req, res) {
        const cartId = req.params.cid;
        try {
            // Obtener carrito y productos
            const cart = await cartRepository.getCartById(cartId);
            const products = cart.products;

            // Arreglo vacío para productos no disponibles
            const productNotAvailable = [];

            // Checar stock y actualizar productos disponibles
            for (const item of products) {
                const prodId = item.product;
                const product = await productRepository.getProductById(prodId);
                if (product.stock >= item.quantity) {
                    // Si hay suficiente, restar cantidad
                    product.stock -= item.quantity;
                    await product.save();
                } else {
                    // Si no, agregar ID al arreglo de no disponibles
                    productNotAvailable.push(prodId);
                }
            }

            const userCart = await UserModel.findOne({ cart: cartId });

            // Crear ticket con datos de compra
            const ticket = new TicketModel({
                code: codeGen(),
                purchase_datetime: new Date(),
                amount: totalPrice(cart.products),
                purchaser: userCart.email
            });
            await ticket.save();

            // Eliminar del carrito los productos que sí se compraron
            cart.products = cart.products.filter(item => productNotAvailable.some(productId => productId.equals(item.products)));

            // Guardar el carrito actualizado en la base de datos
            await cart.save();

            // Enviar email con datos de compra
            await mailingManager.sendMailPurchase(ticket.purchaser, ticket.name, ticket._id, productNamesString)


            res.render('checkout', { ticket: ticket, title: 'Haciendo el Checkout', user: user, isUser })
            console.log(products)


            //res.status(200).json({ productNotAvailable });
        } catch (error) {
            req.logger.error('Error al procesar la compra:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }


}

module.exports = CartController;