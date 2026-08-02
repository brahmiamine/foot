import React from "react"
import PropTypes from "prop-types"
import { Card, CardBody, Col, Row } from "reactstrap"
import { Link } from "react-router-dom"
import { Rating } from "react-simple-star-rating"

const RecentProducts = ({ productDetail }) => {
  return (
    <Row className="mt-3">
      <Col lg={12}>
        <div>
          <h5 className="mb-3">Recent product :</h5>
          <Row>
            {(productDetail.recentProducts || [])?.map((product, key) => (
              <Col xl="4" sm="6" key={"__product__" + key}>
                <Card>
                  <CardBody>
                    <Row className="align-items-center">
                      <Col md="4">
                        <img src={product.img} alt="" className="img-fluid mx-auto d-block" />
                      </Col>
                      <Col md="8">
                        <div className="text-center text-md-start pt-3 pt-md-0">
                          <h5 className="text-truncate">
                            <Link to="#" className="text-dark">
                              {product.name}
                            </Link>
                          </h5>
                          <div className="text-muted mb-4">
                            <Rating
                              ratingValue={product.rating * 20}
                              size={14}
                              iconsCount={5}
                              fillColor="#f1b44c"
                              emptyColor="#74788d"
                              readonly={true}
                              allowHalfIcon={false}
                            />
                          </div>
                          <h5 className="my-0">
                            <span className="text-muted me-2">
                              <del>${product.oldPrice}</del>
                            </span>
                            <b>${product.newPrice}</b>
                          </h5>
                        </div>
                      </Col>
                    </Row>
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Col>
    </Row>
  )
}

RecentProducts.propTypes = {
  recentProducts: PropTypes.array,
}

export default RecentProducts
