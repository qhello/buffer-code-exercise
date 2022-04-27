import React, { Component } from "react";
import actions from "../actions";
import Update from "./Update";

class UpdateList extends Component {
  render() {
    if (!this.props.updates || !this.props.updates.length) {
      return <p>You have no updates</p>;
    }
    return (
      <div className="update-list">
        {this.props.updates.map((update, idx) => (
          <Update {...update} key={idx} />
        ))}
        <div className="update-list-load-more">
          <button
            onClick={() =>
              this.props.dispatch({ type: actions.LOAD_MORE_UPDATES })
            }
          >
            Load more
          </button>
        </div>
      </div>
    );
    return;
  }
}

export default UpdateList;
