import financialModelingPrep from 'financialmodelingprep';
import dbpool from '../db/connectAWSdb.js';
import jwt from "jsonwebtoken";
import MOMENT from 'moment'


//makeOrder controller
export const makeOrder = async (req, res) =>{
    const currentdate = MOMENT().format('YYYY-MM-DD HH:mm:ss');
    console.log(currentdate)
    const { StockSymbol,BuyHowMuch,AccountBalance,OrderType,cookies } = req.body;
    const apiKey = "gQERlMvVTI5GZJtzaVkQgSLTBpXiuxW7";
    const fmp = financialModelingPrep(apiKey);
    const stockjson = await fmp.stock('AAPL').current_price();
    const payload = jwt.verify(cookies, 'Bhun-er')
    const userID = payload['userID']
    // console.log(cookies)
    // console.log(payload['userID'])
    
    // console.log(stockjson['companiesPriceList'][0]['price'])
    // res.send("stockjson")

    dbpool.getConnection((err, connection) => {
        if (err) throw err;
       
        const query_balance =  `UPDATE Users SET AccountBalance = ?  WHERE UserID = ?`
        let money

        if (OrderType == "Buy") {
            money = AccountBalance - BuyHowMuch
        } else {
            money = AccountBalance + BuyHowMuch
        }

        // const money = AccountBalance-BuyHowMuch
        connection.query(query_balance,[money,userID],async(err,rows)=>{
            if (err) throw err;
            console.log(money)
            //res.status(200).send("Balance Updated")
                 
        }) 

        const query_com =  `SELECT BrokerName, TradingComFee From Brokers WHERE BrokerID = (SELECT BrokerID FROM Users WHERE UserID = ? )`
        connection.query(query_com,[userID],async(err,rows)=>{
            if (err) throw err;
            const com = rows[0];
            console.log(rows)
            if (!com) {
                connection.release();
                return res.status(400).json({ error: "Cannot get data" });
            }
            const RealNoCom = BuyHowMuch*(1-(com['TradingComFee']/100));
            console.log(RealNoCom)
            const Volume = RealNoCom/stockjson['companiesPriceList'][0]['price']  

            const query_StockID = `SELECT * FROM Stocks WHERE StockSymbol = ?`;
            connection.query(query_StockID, [StockSymbol], async(err, rows) => {
                if (err) throw err;
                const stock = rows[0];
                // console.log(stock['StockID'],OrderType,Volume);
                
                if (!stock) {
                    connection.release();
                    return res.status(400).json({ error: "Cannot get data" });
                }
                const query_Order = `INSERT INTO Orders (UserID, StockID, OrderType, Volume, Price, OrderStatus, OrderDateTime) VALUES (?,?,?,?,?,"Pending",?)`
                
                connection.query(query_Order,[userID,stock['StockID'],OrderType,Volume,stockjson['companiesPriceList'][0]['price'],currentdate], (err,result)=>{
                    if (err) throw err
                    const orderInfo = Object.assign({Volume},  {"price": stockjson['companiesPriceList'][0]['price'] }, {RealNoCom}, {"Com":BuyHowMuch-RealNoCom}, {"BrokerName" : com['BrokerName']}, {"orderID" : result['insertId']})
                    console.log(orderInfo)
                    console.log('Insert order complete')
                    connection.release()   
                    res.status(200).send(orderInfo)
                })
            })
        }) 
    })
}

export const makePayment = (req, res) => {
    const {cookies,Amounts, Types, AccountBalance } = req.body
    const payload = jwt.verify(cookies, 'Bhun-er')
    const  userID = payload['userID']
    const currentdate = MOMENT().format('YYYY-MM-DD HH:mm:ss');
    //console.log(currentdate)
    
    dbpool.getConnection(async(err, connection) => {
        if (err) throw err
        try {
            const insertQuery = `INSERT INTO Payments (UserID, Amounts, Types, PaymentDateTime) VALUES(?,?,?,?)`
            connection.query(insertQuery, [userID, Amounts, Types, currentdate], (err, results) => {
                if (err) throw err
                console.log(results)
            })
            const editBalanceQuery = `UPDATE Users SET AccountBalance = ? WHERE UserID = ?`
            let money
            if (Types == "Withdraw") {
                money = AccountBalance - Amounts
            } else {
                money = AccountBalance + Amounts
            }
            connection.query(editBalanceQuery, [money, userID], (err, results) => {
                if (err) throw err
                console.log(results)
                connection.release()
                res.status(200).send('Complete payment : ' + Types + 'success') 
            })
        } catch (error) {
            connection.release()
            console.log(error)
        }
    })
}